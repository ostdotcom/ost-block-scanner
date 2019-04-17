'use strict';
/**
 * This service decode token transfer events of transactions and store them in db accordingly.
 *
 * @module services/transfer/Parser
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ServiceBase = require(rootPrefix + '/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes'),
  FormatTransactionLogs = require(rootPrefix + '/lib/transactionParser/formatTransactionLogs');

// Define serviceType for getting signature.
const serviceType = serviceTypes.TokenTransferParser;

const errorConfig = basicHelper.getErrorConfig();

require(rootPrefix + '/lib/transactionParser/CreateEconomy');
require(rootPrefix + '/lib/cacheMultiManagement/shared/Economy');
require(rootPrefix + '/lib/transactionParser/SumUserTokenBalances');
require(rootPrefix + '/lib/models/sharded/byTransaction/TokenTransfer');
require(rootPrefix + '/lib/economyAddresses/WriteEconomyAddressTransfers');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/TokenTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/AddressBalance');

/**
 * Class for token transfer parser
 *
 * @class
 */
class TokenTransferParser extends ServiceBase {
  /**
   * Constructor for TokenTransferParser
   *
   * @param {Number} chainId: chain id
   * @param {Object} rawCurrentBlock: current block info
   * @param {Object} transactionReceipts: Object of transaction receipts
   * @param {Array} nodesHavingBlock: Array of nodes having the block
   *
   * @constructor
   */
  constructor(chainId, rawCurrentBlock, transactionReceipts, nodesHavingBlock) {
    let params = {
      chainId: chainId,
      currentBlock: rawCurrentBlock,
      transactionReceipts: transactionReceipts,
      nodesHavingBlock: nodesHavingBlock
    };

    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockDetails = rawCurrentBlock;
    oThis.transactionReceiptMap = transactionReceipts;

    oThis.tokenTransfersMap = {};
    oThis.transactionShardsMap = {};
    oThis.shardIdToTxReceiptMap = {};
    oThis.insertionFailedTransactions = [];
    oThis.transferContractAddresses = {};
    oThis.refreshEconomies = {};
    oThis.economyRefreshTransactions = {};
    oThis.nodesHavingBlock = nodesHavingBlock;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      startTime = Date.now(),
      txReceiptLength = Object.keys(oThis.transactionReceiptMap).length;

    logger.info('Inside token transferParser: ', startTime);

    // Validate that all the transaction receipts are from the same block
    let validateResponse = oThis._validateInputTransactionReceipts();
    if (validateResponse.isFailure()) {
      return validateResponse;
    }

    // Decode transfer events
    oThis._fetchTransferEvents();

    // If no token transfers are found to process
    if (Object.keys(oThis.tokenTransfersMap).length <= 0) {
      return responseHelper.successWithData({});
    }

    // Fetch Shards of transactions to insert accordingly.
    let transactionShardResponse = await oThis._fetchTransactionShards();
    if (transactionShardResponse.isFailure()) {
      return transactionShardResponse;
    }

    // Insert in token transfers
    await oThis._insertInTokenTransfers();

    // Insert in economies if not created before
    await oThis._createEconomiesIfNotPresent();

    await oThis._writeEconomyAddressTransfers();

    let userTokenBalancesResp = await oThis._aggregateAddressBalances();

    // Update transactions for token transfers counts and mark dirty if injection fails.
    await oThis._updateTransactions();

    let responseData = userTokenBalancesResp.data || {};
    Object.assign(responseData, {
      injectionFailedTransactionHashes: oThis.insertionFailedTransactions
    });

    logger.info(
      'Done with token transfer parser for batch: ',
      txReceiptLength,
      ' ',
      'Total time:',
      Date.now() - startTime
    );
    return responseHelper.successWithData(responseData);
  }

  /**
   * Validate input transaction receipts against block number
   *
   * @returns {Object}
   * @private
   */
  _validateInputTransactionReceipts() {
    const oThis = this;

    for (let txHash in oThis.transactionReceiptMap) {
      if (
        !oThis.transactionReceiptMap[txHash] ||
        oThis.transactionReceiptMap[txHash].blockHash.toLowerCase() !== oThis.blockDetails.hash.toLowerCase()
      ) {
        return responseHelper.error({
          internal_error_identifier: 's_t_tp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: 'Input data is incorrect ',
          error_config: errorConfig
        });
      }
    }

    return responseHelper.successWithData({});
  }

  /**
   * This method fetches transfer events
   *
   * @private
   */
  _fetchTransferEvents() {
    const oThis = this,
      startTime = Date.now();

    logger.debug('Fetch Transfer Events: ', startTime);

    for (let txHash in oThis.transactionReceiptMap) {
      let trxReceipt = oThis.transactionReceiptMap[txHash];

      let formattedTrxLogResp = new FormatTransactionLogs(trxReceipt).perform();
      if (formattedTrxLogResp.isSuccess() && formattedTrxLogResp.data['tokenTransfers'].length > 0) {
        oThis.tokenTransfersMap[txHash] = formattedTrxLogResp.data['tokenTransfers'];
        oThis.transactionReceiptMap[txHash]['tokenTransferIndices'] =
          formattedTrxLogResp.data['transactionTransferIndices'];
      }
      if (formattedTrxLogResp.isSuccess() && formattedTrxLogResp.data['refreshEconomy']) {
        oThis.economyRefreshTransactions[txHash] = 1;
      }
    }

    logger.debug('Done with fetching transfer events.', Date.now() - startTime);
  }

  /**
   * This method updates transaction tables with token transfers information.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _updateTransactions() {
    const oThis = this,
      startTime = Date.now();
    logger.debug('Updating transaction tables with token transfers information', startTime);
    let insertParams = {},
      transactionHashes = Object.keys(oThis.tokenTransfersMap);

    if (transactionHashes.length <= 0) {
      return Promise.resolve();
    }

    for (let i = 0; i < transactionHashes.length; i++) {
      let trHash = transactionHashes[i],
        tokenTransfers = oThis.tokenTransfersMap[trHash] || [],
        trxReceipt = oThis.transactionReceiptMap[trHash],
        shardId = oThis.transactionShardsMap[trHash];

      insertParams[shardId] = insertParams[shardId] || [];
      insertParams[shardId].push({
        chainId: oThis.chainId.toString(),
        transactionHash: trHash,
        totalTokenTransfers: trxReceipt.tokenTransferIndices.length || 0,
        eventsParsingStatus: oThis.insertionFailedTransactions.includes(trHash) ? '-1' : '0'
      });
    }

    // Based on number of shards make entries in sharded tables in parallel manner.
    let insertPromises = [];
    for (let shardId in insertParams) {
      let trxModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'),
        trxModelObj = new trxModelKlass({ chainId: oThis.chainId, shardIdentifier: shardId });

      for (let index = 0; index < insertParams[shardId].length; index++) {
        insertPromises.push(
          new Promise(function(onResolve, onReject) {
            trxModelObj
              .updateItem(insertParams[shardId][index])
              .then(function(resp) {
                if (!resp || resp.isFailure()) {
                  oThis.insertionFailedTransactions.push(insertParams[shardId][index].transactionHash);
                }
                onResolve();
              })
              .catch(function(err) {
                oThis.insertionFailedTransactions.push(insertParams[shardId][index].transactionHash);
                onResolve();
              });
          })
        );
      }
    }
    logger.debug('Updating transaction tables with token transfers information', Date.now() - startTime);
    return Promise.all(insertPromises);
  }

  /**
   * This method fetches shards of transactions to insert transfers accordingly.
   *
   * @returns {Object}
   *
   * @private
   */
  async _fetchTransactionShards() {
    const oThis = this;

    let transactionHashes = Object.keys(oThis.tokenTransfersMap);

    let shardByTrxCacheKlass = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache');

    let trxShardsResponse = await new shardByTrxCacheKlass({
      transactionHashes: transactionHashes,
      chainId: oThis.chainId,
      consistentRead: 1
    }).fetch();

    if (!trxShardsResponse || trxShardsResponse.isFailure()) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 's_t_tp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: 'Could not fetch transaction shards to insert token transfer ',
          error_config: errorConfig
        })
      );
    }

    for (let i = 0; i < transactionHashes.length; i++) {
      let shardIdentifierHash = trxShardsResponse.data[transactionHashes[i]];
      if (shardIdentifierHash && shardIdentifierHash.shardIdentifier) {
        oThis.transactionShardsMap[transactionHashes[i]] = shardIdentifierHash.shardIdentifier;
      } else {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 's_t_tp_3',
            api_error_identifier: 'something_went_wrong',
            debug_options: 'Could not fetch transaction shards to insert token transfers ',
            error_config: errorConfig
          })
        );
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * This method inserts entries in transactions extended tables
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  _insertInTokenTransfers() {
    const oThis = this,
      startTime = Date.now();

    let insertParams = {},
      tokenTransactions = Object.keys(oThis.tokenTransfersMap);

    logger.debug('Inserting  into token transfers for batch of ', tokenTransactions.length, ' StartTime: ', startTime);

    for (let i = 0; i < tokenTransactions.length; i++) {
      let trHash = tokenTransactions[i],
        tokenTransfers = oThis.tokenTransfersMap[trHash] || [],
        trxReceipt = oThis.transactionReceiptMap[trHash],
        shardId = oThis.transactionShardsMap[trHash];

      insertParams[shardId] = insertParams[shardId] || [];
      for (let j = 0; j < tokenTransfers.length; j++) {
        let transfer = tokenTransfers[j];
        oThis.transferContractAddresses[transfer.contractAddress] = 1;
        insertParams[shardId].push({
          transactionHash: trHash,
          eventIndex: transfer.eventIndex,
          blockNumber: trxReceipt.blockNumber,
          contractAddress: transfer.contractAddress,
          fromAddress: transfer.from,
          toAddress: transfer.to,
          amount: transfer.amount
        });
        if (oThis.economyRefreshTransactions[trHash]) {
          oThis.refreshEconomies[transfer.contractAddress] = 1;
        }
      }
    }

    // Based on number of shards make entries in sharded tables in parallel.
    let insertPromises = [];
    for (let shardId in insertParams) {
      let tokenTrxModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel'),
        tokenTrxModelObj = new tokenTrxModelKlass({ chainId: oThis.chainId, shardIdentifier: shardId });

      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          tokenTrxModelObj
            .batchWriteItem(insertParams[shardId])
            .then(async function(resp) {
              if (!resp || resp.isFailure()) {
                logger.debug('Token transfers insertion failed ', resp);
                for (let index in insertParams[shardId]) {
                  oThis.insertionFailedTransactions.push(insertParams[shardId][index].transactionHash);
                }
              } else {
                await oThis._resetTransfersRelatedCache(insertParams[shardId]);
              }
              onResolve();
            })
            .catch(function(err) {
              logger.debug('Token transfers insertion failed ', err);
              for (let index in insertParams[shardId]) {
                oThis.insertionFailedTransactions.push(insertParams[shardId][index].transactionHash);
              }
              onResolve();
            });
        })
      );
    }

    logger.debug(
      'Done with inserting  into token transfers for batch of ',
      tokenTransactions.length,
      ' TotalTime: ',
      Date.now() - startTime
    );
    return Promise.all(insertPromises);
  }

  /**
   * For contracts of token transfers create entries in economies if not present
   *
   * @returns {Promise<void>}
   */
  async _createEconomiesIfNotPresent() {
    const oThis = this,
      startTime = Date.now();

    logger.debug('Creating economies if not present already. ', startTime);

    let economyCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache');

    let economyCacheResp = await new economyCacheKlass({
      economyContractAddresses: Object.keys(oThis.transferContractAddresses),
      chainId: oThis.chainId,
      consistentRead: 1
    }).fetch();

    let economiesData = economyCacheResp.data;

    let economyInsertPromise = [];
    // Check if any contract deployment transaction is present
    for (let contractAddress in oThis.transferContractAddresses) {
      let alreadyPresent = economiesData[contractAddress] && Object.keys(economiesData[contractAddress]).length > 0;

      // Economy is already present in DB.
      // If refresh economies is not required for it then don't work on this economy
      if (alreadyPresent && !oThis.refreshEconomies[contractAddress]) {
        continue;
      }

      let createEconomyKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CreateEconomy'),
        createEconomyObj = new createEconomyKlass(
          {
            contractAddress: contractAddress,
            chainId: oThis.chainId,
            provider: oThis.nodesHavingBlock[0],
            ignoreErc20Validations: 1,
            blockTimestamp: oThis.blockDetails.timestamp,
            isUpdate: alreadyPresent ? 1 : 0
          },
          { conversionFactor: economiesData[contractAddress].conversionFactor }
        );
      economyInsertPromise.push(createEconomyObj.perform());
    }

    if (economyInsertPromise.length > 0) {
      await Promise.all(economyInsertPromise);
    }
    logger.debug('Done with creating economies. ', Date.now() - startTime);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Add address transactions.
   *
   * @returns {Promise<void>}
   */
  async _writeEconomyAddressTransfers() {
    const oThis = this,
      startTime = Date.now();
    logger.debug('Inserting into economy address transfers.', startTime);

    let addAddrTrxKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'WriteEconomyAddressTransfers'),
      addAddrTrxObj = new addAddrTrxKlass({
        transactionReceiptMap: oThis.transactionReceiptMap,
        chainId: oThis.chainId,
        tokenTransfersMap: oThis.tokenTransfersMap,
        blockNumber: oThis.blockDetails.number
      });

    let addAddrTrxResponse = await addAddrTrxObj.perform();

    if (!addAddrTrxResponse || addAddrTrxResponse.isFailure()) {
      logger.debug('Address Token transfers failed ', addAddrTrxResponse);
      oThis.insertionFailedTransactions = Object.keys(oThis.transactionReceiptMap);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 's_t_tp_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: 'Could not add address transfers in db' + params,
          error_config: errorConfig
        })
      );
    } else if (
      addAddrTrxResponse.data.insertionFailed ||
      Object.keys(addAddrTrxResponse.data.economyAddressShardsNotFound).length > 0
    ) {
      // As entry in address transfers didn't went through mark them dirty.
      oThis.insertionFailedTransactions = Object.keys(oThis.transactionReceiptMap);
    }
    logger.debug('Done with inserting into economy address transfers. ', Date.now() - startTime);
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Update Balances of transactions and token transfers
   *
   * @returns {Promise<void>}
   */
  async _aggregateAddressBalances() {
    const oThis = this,
      startTime = Date.now();

    logger.debug('Aggergating user balances: ', startTime);

    let balanceSumKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SumUserTokenBalances'),
      balanceSumObj = new balanceSumKlass({
        tokenTransferMap: oThis.tokenTransfersMap,
        chainId: oThis.chainId
      });

    let userBalanceResp = await balanceSumObj.perform();

    if (userBalanceResp.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData(userBalanceResp.data));
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
  }

  /**
   * Clear token transfers cache
   *
   * @returns {Promise<void>}
   */
  async _resetTransfersRelatedCache(transferRows) {
    const oThis = this;

    let eventIndexMap = {},
      balanceCacheClearMap = {};
    for (let index in transferRows) {
      let te = transferRows[index];
      eventIndexMap[te.transactionHash] = eventIndexMap[te.transactionHash] || [];
      eventIndexMap[te.transactionHash].push(te.eventIndex);

      balanceCacheClearMap[te.contractAddress] = balanceCacheClearMap[te.contractAddress] || [];
      balanceCacheClearMap[te.contractAddress].push(te.fromAddress);
      balanceCacheClearMap[te.contractAddress].push(te.toAddress);
    }

    let cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferCache'),
      cacheObj = new cacheKlass({
        chainId: oThis.chainId,
        transactionHashEventIndexesMap: eventIndexMap
      });

    await cacheObj.setTransfersCache(transferRows);

    let AddressBalanceCacheClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBalanceCache');
    for (let contractAddress in balanceCacheClearMap) {
      new AddressBalanceCacheClass({
        chainId: oThis.chainId,
        economyContractAddress: contractAddress,
        addresses: balanceCacheClearMap[contractAddress]
      }).clear();
    }
  }
}

InstanceComposer.registerAsShadowableClass(TokenTransferParser, coreConstants.icNameSpace, 'TokenTransferParser');
