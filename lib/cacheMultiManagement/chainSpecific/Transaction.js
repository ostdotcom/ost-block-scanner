'use strict';
/**
 * Transaction data by hash cache
 *
 * @module lib/cacheMultiManagement/chainSpecific/Transaction
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byTransaction/Transaction');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');

/**
 * Class for transaction data cache
 *
 * @class
 */
class TransactionCache extends BaseCache {
  /**
   * Constructor for transaction data cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Array} params.transactionHashes
   * @param {Object} params.transactionHashToShardIdentifierMap
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.transactionHashes = params['transactionHashes'];
    oThis.transactionHashToShardIdentifierMap = params['transactionHashToShardIdentifierMap'] || {}; // This should be an hash indexed by transaction hash whose value will be shardIdentifier
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

    // Call sub class method to set cache key using params provided
    oThis.setCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Set cache keys
   *
   * @returns {{}}
   */
  setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      oThis.cacheKeys[`${oThis._cacheKeyPrefix()}cs_t_${oThis.chainId}_${oThis.transactionHashes[i].toLowerCase()}`] =
        oThis.transactionHashes[i];
    }

    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);

    return oThis.cacheKeys;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3600; // 1 hour

    return oThis.cacheExpiry;
  }

  /**
   * Set cache implementer in oThis.cacheImplementer and return it
   *
   * @returns {Object}
   */
  setCacheImplementer() {
    const oThis = this,
      cacheObject = oThis
        .ic()
        .getInstanceFor(coreConstants.icNameSpace, 'cacheProvider')
        .getInstance(storageConstants.sharded, oThis.chainId);

    oThis.cacheImplementer = cacheObject.cacheInstance;

    return oThis.cacheImplementer;
  }

  /**
   * Fetch data from source
   *
   * @param {Array} cacheMissTransactionHashes
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissTransactionHashes) {
    const oThis = this,
      transactionHashesData = {},
      transactionHashGroupedByShardIdentifierMap = {},
      TransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'),
      ShardIdentifierByTransactionCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache'),
      txHashesWhoseShardIdNeeded = [];

    // Divide transaction hashes into two groups: those which have shardIdentifiers and those which don't.
    for (let index = 0; index < cacheMissTransactionHashes.length; index++) {
      let txHash = cacheMissTransactionHashes[index],
        shardIdentifier = oThis.transactionHashToShardIdentifierMap[txHash];

      if (shardIdentifier) {
        transactionHashGroupedByShardIdentifierMap[shardIdentifier] =
          transactionHashGroupedByShardIdentifierMap[shardIdentifier] || [];
        transactionHashGroupedByShardIdentifierMap[shardIdentifier].push(txHash);
      } else {
        txHashesWhoseShardIdNeeded.push(txHash);
      }
    }

    if (txHashesWhoseShardIdNeeded.length > 0) {
      let getShardRsp = await new ShardIdentifierByTransactionCache({
        chainId: oThis.chainId,
        transactionHashes: txHashesWhoseShardIdNeeded,
        consistentRead: oThis.consistentRead
      }).fetch();

      if (getShardRsp.isFailure()) {
        return Promise.reject(getShardRsp);
      }

      // Group txHashes by shard identifiers they are present in.
      for (let i = 0; i < txHashesWhoseShardIdNeeded.length; i++) {
        let txHash = txHashesWhoseShardIdNeeded[i],
          shardIdentifier = (getShardRsp.data[txHash] || {})['shardIdentifier'];

        if (shardIdentifier) {
          transactionHashGroupedByShardIdentifierMap[shardIdentifier] =
            transactionHashGroupedByShardIdentifierMap[shardIdentifier] || [];
          transactionHashGroupedByShardIdentifierMap[shardIdentifier].push(txHash);
        }
      }
    }

    let promises = [];
    for (let shardIdentifier in transactionHashGroupedByShardIdentifierMap) {
      let promise = new TransactionModel({
        chainId: oThis.chainId,
        shardIdentifier: shardIdentifier,
        consistentRead: oThis.consistentRead
      }).getTransactions(transactionHashGroupedByShardIdentifierMap[shardIdentifier]);

      promise.then(function(cacheRsp) {
        // Do not change the line below because we do not want to send multiple RESULT objects in responseData.
        // In the line below, we are consolidating all the data objects and sending out one RESULT object.
        Object.assign(transactionHashesData, cacheRsp.data);
      });

      promises.push(promise);
    }

    await Promise.all(promises);

    return Promise.resolve(responseHelper.successWithData(transactionHashesData));
  }
}

InstanceComposer.registerAsShadowableClass(TransactionCache, coreConstants.icNameSpace, 'TransactionCache');

module.exports = TransactionCache;
