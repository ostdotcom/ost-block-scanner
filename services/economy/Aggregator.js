'use strict';
/**
 * This service receives block number and aggregate data for economies involved in block's transactions.
 *
 * @module services/economy/Aggregator
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  ServiceBase = require(rootPrefix + '/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes'),
  formatTransactionsData = require(rootPrefix + '/lib/economyAddresses/FormatTransactionsData');

const serviceType = serviceTypes.EconomyAggregator,
  InstanceComposer = OSTBase.InstanceComposer,
  errorConfig = basicHelper.getErrorConfig(),
  batchPagination = 80;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber');
require(rootPrefix + '/lib/block/FetchTransactions');
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');
require(rootPrefix + '/lib/cacheMultiManagement/shared/Economy');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');
require(rootPrefix + '/lib/models/shared/Economy');

/**
 * Class for Economy Aggregator
 *
 * @class
 */
class EconomyAggregator extends ServiceBase {
  /**
   * Constructor for TokenTransferParser
   *
   * @param {Number} chainId: chain id
   * @param {Object} blockNumber: Block number to aggregate data for
   *
   * @constructor
   */
  constructor(chainId, blockNumber) {
    let params = {
      chainId: chainId,
      blockNumber: blockNumber
    };

    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockNumber = blockNumber;
    oThis.blockTimestamp = null;
    oThis.totalTransactions = 0;
    oThis.transactionsMap = null;
    oThis.transactionTransfersMap = {};
    oThis.aggregatedEconomy = {};
    oThis.economyAddressTransfersMap = {};
    oThis.consistentRead = 1;
    oThis.shardEconomyAddrModelObj = null;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      startTime = Date.now();

    logger.info('======== Aggregator Started for block ===========', oThis.blockNumber, 'startTime: ', startTime);

    // Fetch block details
    let blockResponse = await oThis._fetchBlockDetails();
    if (blockResponse.isFailure()) {
      return blockResponse;
    }

    // Transactions are not present in block
    if (oThis.totalTransactions === 0) {
      logger.info(
        '========== Aggregator completed for Empty(no transactions) block ',
        oThis.blockNumber,
        'Total time taken ============================ ',
        Date.now() - startTime
      );
      return responseHelper.successWithData({});
    }

    // Fetch transactions and transfers of block
    let FetchTx = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'FetchBlockTransactions'),
      fetchTxResp = await new FetchTx(oThis.chainId, oThis.blockNumber, oThis.blockTimestamp, true).perform();

    if (fetchTxResp.isFailure() || oThis.totalTransactions !== Object.keys(fetchTxResp.data.transactionsData).length) {
      return responseHelper.error({
        internal_error_identifier: 's_e_a_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Could not fetch transactions for given block ' + oThis.blockNumber,
        error_config: errorConfig
      });
    }

    logger.info(
      '========== Transactions fetched from ddb ',
      'Total time taken ============================ ',
      Date.now() - startTime
    );

    oThis.transactionsMap = fetchTxResp.data.transactionsData;
    const tokenTransfers = fetchTxResp.data.tokenTransfers || {};
    for (let txHash in tokenTransfers) {
      const transferEvents = (tokenTransfers[txHash] || {}).transfers;
      for (let transferIndex in transferEvents) {
        oThis.transactionTransfersMap[txHash] = oThis.transactionTransfersMap[txHash] || [];
        oThis.transactionTransfersMap[txHash].push(transferEvents[transferIndex]);
      }
    }

    let ShardByEconomyAddressModel = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel');
    oThis.shardEconomyAddrModelObj = new ShardByEconomyAddressModel({ consistentRead: oThis.consistentRead });

    // Aggregate transfers data as economy
    oThis._aggregateEconomyTransfersData();

    let promisesArray = [];
    // Fetch economies
    promisesArray.push(oThis._fetchEconomies());

    // Update total transactions or transfers for addresses involved in transactions
    promisesArray.push(oThis._updateTotalTransactionsForAddresses());

    // Aggregate transfers data and update total transfers in economy addresses
    promisesArray.push(oThis._updateTotalTransfersForAddresses());

    // Fetch unique token holders created in block
    promisesArray.push(oThis._findUniqueTokenHoldersInBlock(oThis.economyAddressTransfersMap));

    await Promise.all(promisesArray);

    // Update economies with above aggregated data
    await oThis._updateStatsInEconomy();

    logger.info(
      '========== Aggregator completed for block ',
      oThis.blockNumber,
      'Total time taken ============================ ',
      Date.now() - startTime
    );

    oThis.aggregatedEconomy = {};
    oThis.economyAddressTransfersMap = {};

    return responseHelper.successWithData({});
  }

  /**
   * Fetch Block details
   *
   * @returns {Object<responseHelper>}
   */
  async _fetchBlockDetails() {
    const oThis = this;

    let blockNumberCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockDataByBlockNoCache'),
      blockNoCacheObj = new blockNumberCacheKlass({ chainId: oThis.chainId, blockNumbers: [oThis.blockNumber] }),
      blockDetails = await blockNoCacheObj.fetch();

    // If block Data is not present then return error
    if (blockDetails.isFailure() || !blockDetails.data[oThis.blockNumber.toString()]) {
      return responseHelper.error({
        internal_error_identifier: 's_e_a_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Block details are not found for given block ' + oThis.blockNumber,
        error_config: errorConfig
      });
    }

    let bd = blockDetails.data[oThis.blockNumber.toString()];
    oThis.blockTimestamp = bd.blockTimestamp;
    oThis.totalTransactions = parseInt(bd.totalTransactions);

    return responseHelper.successWithData({});
  }

  /**
   * Aggregate
   *
   * @returns {Object<responseHelper>}
   */
  _aggregateEconomyTransfersData() {
    const oThis = this;

    // Loop on all transfers of block
    for (let txHash in oThis.transactionTransfersMap) {
      let tokenTransfers = oThis.transactionTransfersMap[txHash];
      for (let transferIndex in tokenTransfers) {
        let transferEvent = tokenTransfers[transferIndex],
          erc20 = transferEvent.contractAddress;

        oThis.aggregatedEconomy[erc20] = oThis.aggregatedEconomy[erc20] || {
          totalTransfers: 0,
          totalBTtransferValue: basicHelper.convertToBigNumber(0),
          tokenHolders: 0
        };

        // Add total transfers
        oThis.aggregatedEconomy[erc20]['totalTransfers'] += 1;

        // We won't consider transfers which have 0x000... address in to or from in transfer for calculation of volume
        if (
          transferEvent.fromAddress === coreConstants.zeroAddress ||
          transferEvent.toAddress === coreConstants.zeroAddress
        ) {
          continue;
        }

        // Add to volume
        let transferAmount = basicHelper.convertToBigNumber(transferEvent.amount);
        oThis.aggregatedEconomy[erc20]['totalBTtransferValue'] = oThis.aggregatedEconomy[erc20][
          'totalBTtransferValue'
        ].add(transferAmount);
      }
    }
  }

  /**
   * Update total transactions for addresses in shard by economy addresses
   *
   * @returns {Object<responseHelper>}
   */
  async _updateTotalTransactionsForAddresses() {
    const oThis = this;

    // Format data as economy address transactions and economy address transfers
    let economyAddressTransactionsMap = formatTransactionsData.formatAsEconomyAddressTransactions(
      oThis.transactionsMap
    );

    let promises = [],
      requestCount = 1;
    for (let economyAddr in economyAddressTransactionsMap) {
      for (let userAddr in economyAddressTransactionsMap[economyAddr]) {
        let txCount = Object.keys(economyAddressTransactionsMap[economyAddr][userAddr]).length;
        promises.push(oThis._addTransactionCountInAddresses(userAddr, economyAddr, txCount));

        if (requestCount % batchPagination === 0) {
          await Promise.all(promises);
          promises = [];
        }

        requestCount += 1;
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return responseHelper.successWithData({});
  }

  /**
   * Update total transfers for economy addresses in shard by economy addresses table
   *
   * @returns {Object<responseHelper>}
   */
  async _updateTotalTransfersForAddresses() {
    const oThis = this;

    // Format data as economy address transactions and economy address transfers
    oThis.economyAddressTransfersMap = formatTransactionsData.formatAsEconomyAddressTransfers(
      oThis.transactionTransfersMap
    );

    let promisesArr = [],
      requestCount = 1;

    for (let economyAddr in oThis.economyAddressTransfersMap) {
      for (let userAddr in oThis.economyAddressTransfersMap[economyAddr]) {
        let transfersCount = 0;

        // Loop on transactions to find out total indexes
        for (let txHash in oThis.economyAddressTransfersMap[economyAddr][userAddr]) {
          transfersCount += oThis.economyAddressTransfersMap[economyAddr][userAddr][txHash].length;
        }

        promisesArr.push(oThis._addTransactionCountInAddresses(userAddr, economyAddr, transfersCount));

        if (requestCount % batchPagination === 0) {
          await Promise.all(promisesArr);
          promisesArr = [];
        }

        requestCount += 1;
      }
    }

    if (promisesArr.length > 0) {
      await Promise.all(promisesArr);
    }

    return responseHelper.successWithData({});
  }

  /**
   * Add transactions count in shard by economy addresses
   *
   * @returns {Promise<responseHelper>}
   */
  _addTransactionCountInAddresses(userAddress, economyAddress, transactionsCount) {
    const oThis = this;

    let economyIdentifierForContractAddr = oThis.chainId + '-' + economyAddress,
      keyMap = oThis.shardEconomyAddrModelObj._keyObj({
        address: userAddress,
        economyIdentifier: economyIdentifierForContractAddr
      });
    let updateParams = {
      TableName: oThis.shardEconomyAddrModelObj.tableName(),
      Key: keyMap,
      UpdateExpression: 'Add #totalTransactionsOrTransfers :transactionsCount',
      ExpressionAttributeNames: {
        '#totalTransactionsOrTransfers': oThis.shardEconomyAddrModelObj.shortNameFor('totalTransactionsOrTransfers')
      },
      ExpressionAttributeValues: {
        ':transactionsCount': { N: transactionsCount.toString() }
      },
      ReturnValues: 'NONE'
    };

    return oThis.shardEconomyAddrModelObj.ddbServiceObj.updateItem(updateParams);
  }

  /**
   * Fetch economies
   *
   * @returns {Promise<Any>}
   */
  _fetchEconomies() {
    const oThis = this;

    let EconomyCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache'),
      erc20Addresses = Object.keys(oThis.aggregatedEconomy),
      promisesArray = [];

    while (true) {
      // Fetch economy data in batches of batchPagination
      let batchedErc20Addresses = erc20Addresses.splice(0, batchPagination);

      if (batchedErc20Addresses.length <= 0) {
        break;
      }

      let promise = new EconomyCache({
        chainId: oThis.chainId,
        economyContractAddresses: batchedErc20Addresses
      }).fetch();

      promise.then(function(resp) {
        let economiesData = resp.data;

        for (let erc20Address in economiesData) {
          let ed = economiesData[erc20Address];
          Object.assign(oThis.aggregatedEconomy[erc20Address], {
            decimals: ed.decimals,
            conversionFactor: ed.conversionFactor,
            balanceMaintainSupport: ed.balanceMaintainSupport
          });
        }
      });

      promisesArray.push(promise);
    }

    return Promise.all(promisesArray);
  }

  /**
   * Fetch economies
   *
   * @returns {Promise<Any>}
   */
  _findUniqueTokenHoldersInBlock(economyUserTransfersMap) {
    const oThis = this;

    let economyAddrCacheKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
      promisesArray = [];

    for (let economyAddr in economyUserTransfersMap) {
      let userAddresses = Object.keys(economyUserTransfersMap[economyAddr]);

      while (true) {
        let batchUserAddresses = userAddresses.splice(0, batchPagination);

        if (batchUserAddresses.length <= 0) {
          break;
        }

        let promise = new economyAddrCacheKlass({
          economyContractAddress: economyAddr,
          addresses: batchUserAddresses,
          chainId: oThis.chainId,
          consistentRead: oThis.consistentRead
        }).fetch();

        promise.then(function(resp) {
          let userAddrData = resp.data;

          for (let eachAddress in userAddrData) {
            let ead = userAddrData[eachAddress];
            if (ead['createdInBlock'] && ead['createdInBlock'] == oThis.blockNumber) {
              oThis.aggregatedEconomy[economyAddr]['tokenHolders'] += 1;
            }
          }
        });
        promisesArray.push(promise);
      }
    }

    return Promise.all(promisesArray);
  }

  /**
   * Update final aggregated stats in economy
   *
   * @returns {Promise<Any>}
   */
  async _updateStatsInEconomy() {
    const oThis = this,
      EconomyModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyModel'),
      economyModelObject = new EconomyModel({
        consistentRead: oThis.consistentRead
      });

    let promises = [];

    for (let economyaddr in oThis.aggregatedEconomy) {
      let economy = oThis.aggregatedEconomy[economyaddr],
        deltaTTH = economy.tokenHolders,
        deltaTTK = economy.totalTransfers,
        totalVolume = economy.balanceMaintainSupport
          ? basicHelper
              .convertToNormalForPower(economy.totalBTtransferValue, economy.decimals)
              .div(basicHelper.convertToBigNumber(economy.conversionFactor))
              .toFixed(5)
          : 0;

      let updateParams = {
        TableName: economyModelObject.tableName(),
        Key: economyModelObject._keyObj({ contractAddress: economyaddr, chainId: oThis.chainId }),
        UpdateExpression:
          'Set #totalTokenHolders = #totalTokenHolders + :deltaTTH, #totalTokenTransfers = #totalTokenTransfers + :deltaTTK,' +
          ' #totalVolume = #totalVolume + :totalVolume, #updatedTimestamp = :updatedTimestamp',
        ExpressionAttributeNames: {
          '#totalTokenHolders': economyModelObject.shortNameFor('totalTokenHolders'),
          '#totalTokenTransfers': economyModelObject.shortNameFor('totalTokenTransfers'),
          '#totalVolume': economyModelObject.shortNameFor('totalVolume'),
          '#updatedTimestamp': economyModelObject.shortNameFor('updatedTimestamp')
        },
        ExpressionAttributeValues: {
          ':deltaTTH': { N: deltaTTH.toString() },
          ':deltaTTK': { N: deltaTTK.toString() },
          ':totalVolume': { N: totalVolume.toString() },
          ':updatedTimestamp': { N: Math.floor(new Date().getTime() / 1000).toString() }
        },
        ReturnValues: 'NONE'
      };

      promises.push(economyModelObject.ddbServiceObj.updateItem(updateParams));
    }

    await Promise.all(promises);

    const cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache'),
      cacheObj = new cacheKlass({
        chainId: oThis.chainId,
        economyContractAddresses: Object.keys(oThis.aggregatedEconomy)
      });

    return cacheObj.clear();
  }
}

InstanceComposer.registerAsShadowableClass(EconomyAggregator, coreConstants.icNameSpace, 'EconomyAggregator');
