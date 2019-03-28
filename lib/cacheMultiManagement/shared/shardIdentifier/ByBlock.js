'use strict';
/**
 * By block cache
 *
 * @module lib/cacheMultiManagement/shared/shardIdentifier/ByBlock
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByBlock');

/**
 * Class for shard by block cache
 *
 * @class
 */
class ShardIdentifierByBlockNoCache extends BaseCache {
  /**
   * Constructor for shard by block cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.blockNumbers = params['blockNumbers'];
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
   * Set cache key
   *
   * @returns {Object}
   */
  setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.blockNumbers.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 's_si_bb_' + oThis.chainId + '_' + oThis.blockNumbers[i]] =
        oThis.blockNumbers[i];
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

    oThis.cacheExpiry = 86400; // 24 hours

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
   * @param {Array} cacheMissBlockNumbers
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissBlockNumbers) {
    const oThis = this,
      ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      response = await new ShardByBlockModel({
        consistentRead: oThis.consistentRead
      }).getShardIdentifiers(oThis.chainId, cacheMissBlockNumbers);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardIdentifierByBlockNoCache,
  coreConstants.icNameSpace,
  'ShardIdentifierByBlockNoCache'
);

module.exports = ShardIdentifierByBlockNoCache;
