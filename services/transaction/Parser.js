'use strict';
/**
 * This service fetches transactions from geth and parse them to store in db accordingly.
 *
 * @module services/transaction/Parser
 */
const rootPrefix = '../..',
  ServiceBase = require(rootPrefix + '/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fetchTransactionsReceiptsKlass = require(rootPrefix + '/services/chainInteractions/fetchTransactions'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Define serviceType for getting signature.
const serviceType = serviceTypes.TransactionParser;

const errorConfig = basicHelper.getErrorConfig();

require(rootPrefix + '/lib/transactionParser/CreateEconomy');
require(rootPrefix + '/lib/transactionParser/MergePendingTx');
require(rootPrefix + '/lib/transactionParser/AddTransactions');
require(rootPrefix + '/lib/economyAddresses/WriteEconomyAddressTransactions');
require(rootPrefix + '/services/transfer/Parser');

/**
 * Class for transaction parser
 *
 * @class
 */
class TransactionParser extends ServiceBase {
  /**
   * Constructor for TransactionParser
   *
   * @param {Number} chainId: chain id
   * @param {Object} rawCurrentBlock: current block info
   * @param {Array} transactionHashes: Array of transaction hashes
   * @param {Array} nodesHavingBlock: Array of nodes having the block
   */
  constructor(chainId, rawCurrentBlock, transactionHashes, nodesHavingBlock) {
    let params = {
      chainId: chainId,
      currentBlock: rawCurrentBlock,
      transactionHashes: transactionHashes,
      nodesHavingBlock: nodesHavingBlock
    };

    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockDetails = rawCurrentBlock;
    oThis.transactionHashes = transactionHashes;
    oThis.nodesHavingBlock = nodesHavingBlock;

    oThis.unprocessedTransactions = transactionHashes;
    oThis.transactionReceiptMap = {};
    oThis.processedTransactions = [];
    oThis.transactionReceiptsNotFound = [];
    oThis.transactionsAlreadyPresent = [];
    oThis.transactionShardsMap = {};
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      startTime = Date.now();
    logger.info(
      '======== Transaction Parser ===========',
      'transactionsCounts: ',
      oThis.transactionHashes.length,
      'startTime: ',
      startTime
    );

    // Add multiple geth
    let fetchTrxReceiptsObj = new fetchTransactionsReceiptsKlass(oThis.nodesHavingBlock, oThis.transactionHashes),
      receiptsData = await fetchTrxReceiptsObj.perform();

    logger.info(
      '========== Transaction receipts fetch started at ',
      startTime,
      'Total time taken ============================ ',
      Date.now() - startTime
    );

    if (!receiptsData || receiptsData.isFailure() || !receiptsData.data) {
      return responseHelper.error({
        internal_error_identifier: 's_tp_i_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Could not fetch transaction receipts for transactions ' + oThis.transactionHashes,
        error_config: errorConfig
      });
    }

    // Validate that all the transaction receipts are from the same block
    let validateResponse = oThis._validateInputTransactionReceipts(receiptsData);
    if (validateResponse.isFailure()) {
      return validateResponse;
    }

    await oThis._createEconomiesIfAny();

    // If merging of pending transactions failed, then return error
    let mergedData = await oThis._mergePendingTx();
    if (mergedData.isFailure()) {
      return mergedData;
    }

    await oThis._addTransactionAndDetails();

    // If transactions entry was not created then return error
    // If there are transactions which are not processed in this batch, mark them dirty.
    if (oThis.unprocessedTransactions.length > 0 || oThis.transactionsAlreadyPresent.length > 0) {
      await oThis._updateTransactions();
      return responseHelper.error({
        internal_error_identifier: 's_tp_i_6',
        api_error_identifier: 'something_went_wrong',
        debug_options: ' Could not create entry in transactions table or they are already present in db. ',
        error_config: errorConfig
      });
    }

    await oThis._insertAddressTransactions();

    logger.info(
      '========== DONE with transaction parser started at ',
      startTime,
      '============================ BatchSize: ',
      oThis.transactionHashes.length,
      ' Total time ====== ',
      Date.now() - startTime
    );

    return responseHelper.successWithData({
      transactionReceiptsNotFound: oThis.transactionReceiptsNotFound,
      transactionReceiptMap: oThis.transactionReceiptMap,
      unprocessedTransactions: oThis.unprocessedTransactions,
      transactionsAlreadyPresent: oThis.transactionsAlreadyPresent
    });
  }

  /**
   * Merge the data from pending transactions into the transaction receipts
   *
   * @returns {Promise<void>}
   * @private
   */
  async _mergePendingTx() {
    const oThis = this,
      startTime = Date.now();

    logger.debug('Merge Pending Transaction: ', startTime);

    let params = {
        chainId: oThis.chainId,
        txHashToReceiptMap: oThis.transactionReceiptMap
      },
      MergePendingTx = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'MergePendingTx'),
      mergePendingTxObject = new MergePendingTx(params);

    let mergedData = await mergePendingTxObject.perform();
    if (mergedData.isFailure()) {
      return responseHelper.error({
        internal_error_identifier: 's_tp_i_6',
        api_error_identifier: 'something_went_wrong',
        debug_options: ' Pending transactions could not be merged. ',
        error_config: errorConfig
      });
    }

    oThis.transactionReceiptMap = mergedData.data;

    logger.debug('Done with Merging Pending Transaction: ', Date.now() - startTime);

    return responseHelper.successWithData({});
  }

  /**
   * Add transactions and transactions extended details.
   *
   * @returns {Promise<void>}
   */
  async _addTransactionAndDetails() {
    const oThis = this,
      startTime = Date.now();

    logger.debug('Add transactions and transactions extended details: ', startTime);

    let addTrxKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddTransactions'),
      addTrxObj = new addTrxKlass({
        transactionReceiptMap: oThis.transactionReceiptMap,
        chainId: oThis.chainId
      });

    let addTrxResponse = await addTrxObj.perform();

    if (!addTrxResponse || addTrxResponse.isFailure() || !addTrxResponse.data) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 's_tp_i_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: 'Could not add transactions in db' + addTrxResponse,
          error_config: errorConfig
        })
      );
    }

    oThis.unprocessedTransactions = addTrxResponse.data.unProcessedTransactions;
    oThis.processedTransactions = addTrxResponse.data.processedTransactions;
    oThis.transactionsAlreadyPresent = addTrxResponse.data.transactionsAlreadyPresent;
    oThis.transactionShardsMap = addTrxResponse.data.transactionShardsMap;

    logger.debug('Add transactions and transactions extended details: ', Date.now() - startTime);
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * For contract deployment transactions create entries if ERC20 contract is deployed.
   *
   * @returns {Promise<void>}
   */
  async _createEconomiesIfAny() {
    const oThis = this,
      startTime = Date.now();
    logger.debug('Create Economies:', startTime);
    let economyInsertPromise = [];
    // Check if any contract deployment transaction is present
    for (let trHash in oThis.transactionReceiptMap) {
      let trxReceipt = oThis.transactionReceiptMap[trHash];

      if (trxReceipt.contractAddress && trxReceipt.contractAddress != '0x') {
        let createEconomyKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CreateEconomy'),
          createEconomyObj = new createEconomyKlass({
            contractAddress: trxReceipt.contractAddress,
            chainId: oThis.chainId,
            provider: oThis.nodesHavingBlock[0],
            blockTimestamp: oThis.blockDetails.timestamp
          });
        economyInsertPromise.push(createEconomyObj.perform());
      }
    }

    if (economyInsertPromise.length > 0) {
      await Promise.all(economyInsertPromise);
    }
    logger.debug('Done Creating Economies:', Date.now() - startTime);
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Add address transactions.
   *
   * @returns {Promise<void>}
   */
  async _insertAddressTransactions() {
    const oThis = this,
      startTime = Date.now();
    logger.debug('Insert Into address transactions:', startTime);

    // Send transactions only if their entry in transactions is done
    if (oThis.processedTransactions.length > 0) {
      let transactionReceipts = {};
      for (let i = 0; i < oThis.processedTransactions.length; i++) {
        let txHash = oThis.processedTransactions[i];
        transactionReceipts[txHash] = oThis.transactionReceiptMap[txHash];
      }

      let addAddrTrxKlass = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'WriteEconomyAddressTransactions'),
        addAddrTrxObj = new addAddrTrxKlass({
          transactionReceiptMap: transactionReceipts,
          chainId: oThis.chainId,
          blockNumber: oThis.blockDetails.number
        });

      let addAddrTrxResponse = await addAddrTrxObj.perform();

      if (!addAddrTrxResponse || addAddrTrxResponse.isFailure()) {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 's_tp_i_4',
            api_error_identifier: 'something_went_wrong',
            debug_options: 'Could not add address transactions in db' + addAddrTrxResponse,
            error_config: errorConfig
          })
        );
      } else if (
        addAddrTrxResponse.data.insertionFailed ||
        Object.keys(addAddrTrxResponse.data.economyAddressShardsNotFound).length > 0
      ) {
        // As entry in address transactions didn't went through mark them dirty.
        oThis.unprocessedTransactions = oThis.transactionHashes;
        oThis._updateTransactions();
      }
    }
    logger.debug('Insert Into address transactions:', Date.now() - startTime);
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Validate input transaction receipts against block number
   *
   * @returns {Object}
   * @private
   */
  _validateInputTransactionReceipts(receiptsData) {
    const oThis = this;

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let txHash = oThis.transactionHashes[i],
        txReceipt = receiptsData.data[txHash];
      if (txReceipt) {
        // Compare block hash of transaction and block details
        if (txReceipt.blockHash.toLowerCase() !== oThis.blockDetails.hash.toLowerCase()) {
          return responseHelper.error({
            internal_error_identifier: 's_tp_i_5',
            api_error_identifier: 'something_went_wrong',
            debug_options: ' Block hash of block is not similar to block hash of transaction: ' + txHash,
            error_config: errorConfig
          });
        }
        txReceipt['blockTimestamp'] = oThis.blockDetails.timestamp;
        oThis.transactionReceiptMap[txHash] = txReceipt;
      } else {
        oThis.transactionReceiptsNotFound.push(txHash);
      }
    }

    // If transaction receipt not found for any transaction then return error
    if (oThis.transactionReceiptsNotFound.length > 0) {
      return responseHelper.error({
        internal_error_identifier: 's_tp_i_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Could not fetch transaction receipts for transactions: ' + oThis.transactionReceiptsNotFound,
        error_config: errorConfig
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Update transactions with invalid entry tag
   *
   * @returns {Promise<any>}
   * @private
   */
  _updateTransactions() {
    const oThis = this,
      startTime = Date.now();

    // As there are no dirty transactions then remove
    if (oThis.unprocessedTransactions.length <= 0) {
      return Promise.resolve();
    }

    logger.debug('Updating transaction tables with data not inserted properly tag.', startTime);

    let insertParams = {};

    for (let i = 0; i < oThis.unprocessedTransactions.length; i++) {
      let trHash = oThis.unprocessedTransactions[i],
        shardId = oThis.transactionShardsMap[trHash];

      if (!shardId) {
        continue;
      }

      insertParams[shardId] = insertParams[shardId] || [];
      insertParams[shardId].push({
        chainId: oThis.chainId,
        transactionHash: trHash,
        eventsParsingStatus: '-1'
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
                onResolve();
              })
              .catch(function(err) {
                onResolve();
              });
          })
        );
      }
    }
    logger.debug('Updating transaction tables with insertion failed in future tables.', Date.now() - startTime);
    return Promise.all(insertPromises);
  }
}

InstanceComposer.registerAsShadowableClass(TransactionParser, coreConstants.icNameSpace, 'TransactionParser');
