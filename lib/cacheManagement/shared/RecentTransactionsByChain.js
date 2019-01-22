'use strict';
/**
 * Available Shards for allocation cache
 *
 * @module lib/cacheManagement/shared/RecentTransactionsByChain
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByTransaction');

/**
 * Class for recent tx hashes from a chain cache
 *
 * @class
 */
class RecentTransactionsByChainCache extends BaseCache {
  /**
   * Constructor
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Object} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.consistentBehavior = '1';
    oThis.useObject = false;

    oThis.pageSize = params.pageSize;

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Set cache key
   *
   * @returns {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 's_rtbc_' + oThis.chainId + '_size_' + oThis.pageSize;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 120; // 2 minutes

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
   * @returns {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      ShardByTransaction = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      response = await new ShardByTransaction({ pageSize: oThis.pageSize }).getRecentTransactionHashes(oThis.chainId);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  RecentTransactionsByChainCache,
  coreConstants.icNameSpace,
  'RecentTransactionsByChainCache'
);

module.exports = RecentTransactionsByChainCache;
