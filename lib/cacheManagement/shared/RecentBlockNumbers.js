'use strict';
/**
 * Recent block numbers cache
 *
 * @module lib/cacheManagement/shared/RecentBlockNumbers
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByBlock');

/**
 * Class for recent block numbers cache
 *
 * @class
 */
class RecentBlockNumbersCache extends BaseCache {
  /**
   * Constructor for recent block numbers cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Number} params.pageSize
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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 's_r_b_n_' + oThis.chainId + '_size_' + oThis.pageSize;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 2; // 2 seconds

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
      ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      response = await new ShardByBlockModel({
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      }).getRecentBlocks(oThis.chainId);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  RecentBlockNumbersCache,
  coreConstants.icNameSpace,
  'RecentBlockNumbersCache'
);

module.exports = RecentBlockNumbersCache;
