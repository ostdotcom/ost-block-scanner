'use strict';
/**
 * Shard by transaction cache
 *
 * @module lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByTransaction');

/**
 * Class for shard by transaction cache
 *
 * @class
 */
class ShardIdentifierByTransactionCache extends BaseCache {
  /**
   * Constructor for shard by transaction cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Array} params.transactionHashes
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.transactionHashes = params['transactionHashes'];
    oThis.consistentRead = params['consistentRead'] || 0;
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
    let lowerCaseTxHash;
    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      lowerCaseTxHash = oThis.transactionHashes[i].toLowerCase();
      oThis.cacheKeys[`${oThis._cacheKeyPrefix()}s_si_bt_${oThis.chainId}_${lowerCaseTxHash}`] =
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
        .getInstance(storageConstants.shared);

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
      ShardByTransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      response = await new ShardByTransactionModel({
        consistentRead: oThis.consistentRead
      }).getShardIdentifiers(oThis.chainId, cacheMissTransactionHashes);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardIdentifierByTransactionCache,
  coreConstants.icNameSpace,
  'ShardIdentifierByTransactionCache'
);

module.exports = ShardIdentifierByTransactionCache;
