'use strict';
/**
 * This module receives transaction receipts and decoded events to add in database.
 *
 * @module lib/transactionParser/AddTransactions
 */
const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cidPrefix = require(rootPrefix + '/lib/globalConstant/cidPrefix'),
  formatTransactionLogs = require(rootPrefix + '/lib/transactionParser/formatTransactionLogs'),
  errorConfig = basicHelper.getErrorConfig();

const uuidV4 = require('uuid/v4'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/Transaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/TransactionDetail');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/Transaction');

/**
 *  Class for add transactions service
 *
 * @class
 */
class AddTransactions {
  /**
   * Constructor for add transactions service
   *
   * @param params
   * @param params.transactionReceiptMap: Map of transaction receipts to insert
   * @param params.chainId: Chain Id of transactions
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.transactionReceiptMap = params.transactionReceiptMap;
    oThis.chainId = params.chainId.toString();
    oThis.newTransactionsInserted = [];
    oThis.transactionsAlreadyPresent = [];
    oThis.unProcessedTransactions = [];
    oThis.transactionShardsMap = {};
  }

  /**
   * Main performer method
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/transactionParser/AddTransactions');
      return responseHelper.error({
        internal_error_identifier: 's_tp_at_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._decideShardsOfTransactions();

    await oThis._addInShardByTransactions();

    logger.debug('New transactions ------', oThis.newTransactionsInserted);

    logger.debug('Already Present transactions ------', oThis.transactionsAlreadyPresent);

    // // Decode Transactions
    // oThis._fetchTransferEvents();

    let processedTransactions = [];
    if (oThis.newTransactionsInserted.length > 0) {
      let promisesArray = [];

      promisesArray.push(oThis._insertInTransactions());

      promisesArray.push(oThis._insertInTransactionExtendedTables());

      await Promise.all(promisesArray);
      // // Insert in Token transfers
      // await oThis._insertInTokenTransfers();

      // If transactions are processed then find out which ones are actually processed
      if (oThis.unProcessedTransactions.length > 0) {
        for (let i = 0; i < oThis.newTransactionsInserted.length; i++) {
          if (!oThis.unProcessedTransactions.includes(oThis.newTransactionsInserted[i])) {
            processedTransactions = oThis.newTransactionsInserted[i];
          }
        }
      } else {
        processedTransactions = oThis.newTransactionsInserted;
      }
    }

    logger.debug('Unprocessed transactions ------', oThis.unProcessedTransactions);

    await oThis._clearTransactionsCache();

    return responseHelper.successWithData({
      transactionsAlreadyPresent: oThis.transactionsAlreadyPresent,
      processedTransactions: processedTransactions,
      unProcessedTransactions: oThis.unProcessedTransactions,
      transactionShardsMap: oThis.transactionShardsMap
    });
  }

  /**
   * Decide transaction Shards
   *
   * @returns {Promise<any>}
   * @private
   */
  async _decideShardsOfTransactions() {
    const oThis = this,
      AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache');

    let availableShardsCache = new AvailableShardsCache({ consistentRead: 1 });

    let response = await availableShardsCache.fetch();

    let shardNumbers = response.data[cidPrefix.transaction];

    // shardIndex to be obtained in a round robin manner.
    let trxHashes = Object.keys(oThis.transactionReceiptMap);
    for (let i = 0; i < trxHashes.length; i++) {
      oThis.transactionShardsMap[trxHashes[i]] = oThis.chainId + '_' + shardNumbers[i % shardNumbers.length];
    }

    return Promise.resolve();
  }

  /**
   * Add transactions in Shard By Transactions.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _addInShardByTransactions() {
    const oThis = this;

    let insertPromises = [],
      strxKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      shardTransactionModel = new strxKlass({}),
      timeSlot = oThis.currentTimeSlot();

    // Create params to insert
    let insertData = [];
    for (let trHash in oThis.transactionReceiptMap) {
      let trxReceipt = oThis.transactionReceiptMap[trHash];
      if (trxReceipt && trxReceipt.blockTimestamp) {
        let insertParams = {
          chainId: oThis.chainId,
          transactionHash: trHash,
          timeSlot: timeSlot,
          paginationTimestamp: shardTransactionModel.generatePaginationTimestamp(
            trxReceipt.blockTimestamp,
            trxReceipt.transactionIndex
          ),
          shardIdentifier: oThis.transactionShardsMap[trHash]
        };
        insertData.push(insertParams);
      } else {
        oThis.unProcessedTransactions.push(trHash);
      }
    }

    for (let i = 0; i < insertData.length; i++) {
      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          shardTransactionModel
            .putItem(insertData[i])
            .then(function(resp) {
              if (!resp || resp.isFailure()) {
                if (resp.internalErrorCode.endsWith('ConditionalCheckFailedException')) {
                  oThis.transactionsAlreadyPresent.push(insertData[i].transactionHash);
                  logger.warn(
                    'Transaction already found in DB, finalizer will confirm and work on this transaction: ',
                    insertData[i].transactionHash
                  );
                } else {
                  oThis.unProcessedTransactions.push(insertData[i].transactionHash);
                }
              } else {
                oThis.newTransactionsInserted.push(insertData[i].transactionHash);
                oThis._setShardByTransactionCache(insertData[i]);
              }
              onResolve();
            })
            .catch(function(err) {
              logger.error(err);
              oThis.unProcessedTransactions.push(insertData[i].transactionHash);
              onResolve();
            });
        })
      );
    }
    await Promise.all(insertPromises);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Current time slot
   *
   * @returns {Number}
   */
  currentTimeSlot() {
    let s = 60 * 60 * 24 * 1000, // number of milli-seconds in a day
      d = Date.now();

    return d - (d % s);
  }

  /**
   * Creates transaction insertion parameters
   *
   * @param {Object} transactionReceipt
   * @param {Object} transactionAttributes Attributes to insert in db.
   * @returns {{chainId: *, transactionHash: *, blockNumber: (*|string), transactionIndex: (string|*|number), fromAddress: *, toAddress: (string|*), contractAddress: (string|*|string), value: (*|number), gasLimit: (*|number), gasUsed: (string|*|number), gasPrice: (*|string|number), nonce: (string|*|number), input: (*|string), logs: string, r: (*|string), s: (*|string), v: (*|string), blockTimestamp: (string), transactionStatus: number, transactionInternalStatus: number, updatedTimestamp: number}}
   * @private
   */
  _createTransactionInsertParams(transactionReceipt, transactionAttributes) {
    const oThis = this;

    let transactionStatus = '',
      internalStatus = '';

    if (transactionReceipt.hasOwnProperty('status')) {
      if (transactionReceipt.status == '0x1' || transactionReceipt.status) {
        transactionStatus = 1;
      } else if (transactionReceipt.status == '0x0' || transactionReceipt.status == false) {
        transactionStatus = 0;
      }
      internalStatus = transactionStatus;
    }
    if (transactionReceipt.hasOwnProperty('internalStatus')) {
      internalStatus = transactionReceipt.internalStatus ? 1 : 0;
    }

    let transactionInsertMap = {
      chainId: oThis.chainId,
      transactionUuid: transactionReceipt.transactionUuid || uuidV4(),
      transactionHash: transactionReceipt.transactionHash,
      blockNumber: transactionReceipt.blockNumber || '',
      transactionIndex: transactionReceipt.transactionIndex || 0,
      fromAddress: transactionReceipt.from,
      toAddress: transactionReceipt.to || '',
      contractAddress: transactionReceipt.contractAddress || '',
      value: transactionReceipt.value || '',
      gasUsed: transactionReceipt.gasUsed || 0,
      gasPrice: transactionReceipt.gasPrice || 0,
      gasLimit: transactionReceipt.gas || 0,
      nonce: transactionReceipt.nonce || 0,
      blockTimestamp: transactionReceipt.blockTimestamp || '',
      transactionStatus: transactionStatus,
      transactionInternalStatus: internalStatus,
      updatedTimestamp: Math.floor(new Date().getTime() / 1000)
    };

    let defaultThingsToAdd = Object.keys(transactionInsertMap);

    for (let attr in transactionAttributes) {
      if (!defaultThingsToAdd.includes(attr)) {
        transactionInsertMap[attr] = transactionReceipt[attr] || '';
      }
    }
    transactionInsertMap['eventsParsingStatus'] = 0;

    if (oThis.transactionReceipt && oThis.transactionReceipt.logs && oThis.transactionReceipt.logs.length) {
      let formatTransactionLogsObj = new formatTransactionLogs(oThis.transactionReceipt);
      let logEventsArray = formatTransactionLogsObj.getLogsArrayToDecode(oThis.transactionReceipt.logs).parsableEvents;
      transactionInsertMap['eventsParsingStatus'] = logEventsArray.length ? 1 : 0;
    }

    return transactionInsertMap;
  }

  /**
   * Creates transaction Extended insertion parameters
   *
   * @param {Object} transactionReceipt
   * @param {Object} transactionDetailsAttributes Attributes to insert in db.
   * @returns {{chainId: *, transactionHash: *, blockNumber: (*|string), transactionIndex: (string|*|number), fromAddress: *, toAddress: (string|*), contractAddress: (string|*|string), value: (*|number), gasLimit: (*|number), gasUsed: (string|*|number), gasPrice: (*|string|number), nonce: (string|*|number), input: (*|string), logs: string, r: (*|string), s: (*|string), v: (*|string), blockTimestamp: (string), transactionStatus: number, transactionInternalStatus: number, updatedTimestamp: number}}
   * @private
   */
  _createTransactionExtendedInsertParams(transactionReceipt, transactionDetailsAttributes) {
    const oThis = this;

    let txInput = transactionReceipt.input || '',
      txLogs = JSON.stringify(transactionReceipt.logs || []);

    // We can not keep one item in dynamo table with more than 400kb size
    // so length is compared with 3,50,000
    if (txInput.length + txLogs.length > 350000) {
      txInput.length > txLogs.length ? (txInput = '') : (txLogs = '');
    }

    let transactionDetailsInsertMap = {
      chainId: oThis.chainId,
      transactionHash: transactionReceipt.transactionHash,
      input: txInput,
      logs: txLogs,
      r: transactionReceipt.r || '',
      s: transactionReceipt.s || '',
      v: transactionReceipt.v || '',
      updatedTimestamp: Math.floor(new Date().getTime() / 1000)
    };

    let defaultThingsToAdd = Object.keys(transactionDetailsInsertMap);

    for (let attr in transactionDetailsAttributes) {
      if (!defaultThingsToAdd.includes(attr)) {
        transactionDetailsInsertMap[attr] = transactionReceipt[attr] || '';
      }
    }

    return transactionDetailsInsertMap;
  }

  /**
   * This method inserts entries in transactions table
   *
   * @returns {Promise<any>}
   * @private
   */
  _insertInTransactions() {
    const oThis = this;

    let insertParams = {},
      transactionAttributes = new (oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'))({
        chainId: oThis.chainId
      }).longToShortNamesMap;

    for (let i = 0; i < oThis.newTransactionsInserted.length; i++) {
      let trHash = oThis.newTransactionsInserted[i],
        trxReceipt = oThis.transactionReceiptMap[trHash];

      let shardId = oThis.transactionShardsMap[trHash];
      insertParams[shardId] = insertParams[shardId] || [];
      insertParams[shardId].push(oThis._createTransactionInsertParams(trxReceipt, transactionAttributes));
    }

    // Based on number of shards make entries in sharded tables paralelly.
    let insertPromises = [];
    for (let shardId in insertParams) {
      let trxModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'),
        trxModelObj = new trxModelKlass({ chainId: oThis.chainId, shardIdentifier: shardId });

      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          trxModelObj
            .batchWriteItem(insertParams[shardId])
            .then(function(resp) {
              if (!resp || resp.isFailure()) {
                for (let index in insertParams[shardId]) {
                  oThis.unProcessedTransactions.push(insertParams[shardId][index].transactionHash);
                }
              }
              onResolve();
            })
            .catch(function(err) {
              logger.error('Transactions Batch Insert in Catch block ---- ', err);
              for (let index in insertParams[shardId]) {
                oThis.unProcessedTransactions.push(insertParams[shardId][index].transactionHash);
              }
              onResolve();
            });
        })
      );
    }

    return Promise.all(insertPromises);
  }

  /**
   * This method inserts entries in transactions extended tables
   *
   * @returns {Promise<any>}
   * @private
   */
  _insertInTransactionExtendedTables() {
    const oThis = this;

    let insertParams = {},
      trxExtendedAttributes = new (oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailModel'))(
        { chainId: oThis.chainId }
      ).longToShortNamesMap;

    for (let i = 0; i < oThis.newTransactionsInserted.length; i++) {
      let trHash = oThis.newTransactionsInserted[i],
        trxReceipt = oThis.transactionReceiptMap[trHash];

      let shardId = oThis.transactionShardsMap[trHash];
      insertParams[shardId] = insertParams[shardId] || [];
      insertParams[shardId].push(oThis._createTransactionExtendedInsertParams(trxReceipt, trxExtendedAttributes));
    }

    // Based on number of shards make entries in sharded tables paralelly.
    let insertPromises = [];
    for (let shardId in insertParams) {
      let trxModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailModel'),
        trxExtModelObj = new trxModelKlass({ chainId: oThis.chainId, shardIdentifier: shardId });

      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          trxExtModelObj
            .batchWriteItem(insertParams[shardId])
            .then(function(resp) {
              if (!resp || resp.isFailure()) {
                for (let index in insertParams[shardId]) {
                  oThis.unProcessedTransactions.push(insertParams[shardId][index].transactionHash);
                }
              }
              onResolve();
            })
            .catch(function(err) {
              for (let index in insertParams[shardId]) {
                oThis.unProcessedTransactions.push(insertParams[shardId][index].transactionHash);
              }
              onResolve();
            });
        })
      );
    }

    return Promise.all(insertPromises);
  }

  /**
   * Set transaction inserted in shard by transactions cache
   *
   * @private
   */
  _setShardByTransactionCache(transactionData) {
    const oThis = this;

    let ShardTransactionCacheKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache'),
      shardTransactionCacheObj = new ShardTransactionCacheKlass({
        chainId: oThis.chainId,
        transactionHashes: [transactionData.transactionHash]
      });

    shardTransactionCacheObj._setCache(transactionData.transactionHash, transactionData);
  }

  /**
   * Clear transactions cache
   *
   * @returns {Promise<void>}
   */
  _clearTransactionsCache() {
    const oThis = this;

    let cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionCache'),
      cacheObj = new cacheKlass({
        chainId: oThis.chainId,
        transactionHashes: Object.keys(oThis.transactionReceiptMap)
      });

    cacheObj.clear();
  }
}

InstanceComposer.registerAsShadowableClass(AddTransactions, coreConstants.icNameSpace, 'AddTransactions');
