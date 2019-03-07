'use strict';
/**
 * This service fetches token transfers details of given transaction hashes.
 *
 * @module services/transfer/GetAll
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainSpecific/TransactionTokenTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');

// Define serviceType for getting signature.
const serviceType = serviceTypes.AllTransferDetails;
const ddbQueryBatchSize = 1;

/**
 * Class for getting all token transfer details service
 *
 * @class
 */
class GetAllTransferDetail extends ServicesBase {
  /**
   * Constructor for getting all token transfer details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Array} transactionHashes
   *
   * @constructor
   */
  constructor(chainId, transactionHashes) {
    const params = { chainId: chainId, transactionHashes: transactionHashes };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId.toString();
    oThis.shardTransactionsMap = {};
    oThis.transactionTransferDetails = {};
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._fetchTransactionShards();

    await oThis._fetchTokenTransfers();

    return Promise.resolve(oThis.transactionTransferDetails);
  }

  /**
   * Fetch shards of transactions
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchTransactionShards() {
    const oThis = this;

    let index = 0,
      promises = [],
      isError = false,
      ShardIdentifierByTransactionCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache');
    while (index < oThis.transactionHashes.length) {
      let txHashes = oThis.transactionHashes.slice(index, index + ddbQueryBatchSize);

      promises.push(
        new Promise(function(onResolve, onReject) {
          new ShardIdentifierByTransactionCache({
            chainId: oThis.chainId,
            transactionHashes: txHashes,
            consistentRead: oThis.consistentRead
          })
            .fetch()
            .then(function(resp) {
              if (!isError) {
                isError = resp.isFailure() || !resp.data;
                for (let txHash in resp.data) {
                  let shard = resp.data[txHash]['shardIdentifier'];

                  oThis.shardTransactionsMap[shard] = oThis.shardTransactionsMap[shard] || [];
                  oThis.shardTransactionsMap[shard].push(txHash);
                }
              }
              onResolve();
            })
            .catch(function(error) {
              isError = true;
              onResolve();
            });
        })
      );

      index = index + ddbQueryBatchSize;
    }

    await Promise.all(promises);

    if (isError) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_trf_ga_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch Token transfers
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenTransfers() {
    const oThis = this;

    // Putting parallel queries on different sharded transfer tables
    let promises = [];
    for (let shardId in oThis.shardTransactionsMap) {
      promises.push(oThis._fetchTransfersFromShard(shardId));
    }

    await Promise.all(promises);
  }

  /**
   * Fetch transfers from given shard
   *
   * @param shardIdentifier
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchTransfersFromShard(shardIdentifier) {
    const oThis = this,
      TransactionTokenTransferCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TransactionTokenTransfer');

    let i = 0;
    while (i < oThis.shardTransactionsMap[shardIdentifier].length) {
      // Doing batching here as we don't want to fire many parallel queries on dynamo

      let batchedTxHashes = oThis.shardTransactionsMap[shardIdentifier].slice(i, i + ddbQueryBatchSize),
        promises = [],
        isError = false;

      // Firing parallel queries on dynamo sharded transfer table.
      for (let index in batchedTxHashes) {
        let txHash = batchedTxHashes[index];

        let paramsForTransactionTokenTransferCache = {
          chainId: oThis.chainId,
          transactionHash: txHash,
          shardIdentifier: shardIdentifier
        };

        promises.push(
          new Promise(function(onResolve, onReject) {
            new TransactionTokenTransferCache(paramsForTransactionTokenTransferCache)
              .fetch()
              .then(function(resp) {
                if (!isError) {
                  isError = resp.isFailure() || !resp.data;
                  oThis.transactionTransferDetails[txHash] = resp.data;
                }
                onResolve();
              })
              .catch(function(error) {
                isError = true;
                onResolve();
              });
          })
        );
      }

      await Promise.all(promises);

      if (isError) {
        logger.error('Error in fetching data from Transaction Token Transfer cache');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_trf_ga_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          })
        );
      }

      i = i + ddbQueryBatchSize;
    }
  }
}

InstanceComposer.registerAsShadowableClass(GetAllTransferDetail, coreConstants.icNameSpace, 'GetAllTransferDetail');

module.exports = GetAllTransferDetail;
