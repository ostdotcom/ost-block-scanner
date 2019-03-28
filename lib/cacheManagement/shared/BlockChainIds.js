'use strict';
/**
 * Block number to chain Ids cache
 *
 * @module lib/cacheManagement/shared/BlockChainIds
 */
const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByBlock');

/**
 * Class for block number to chainIds cache
 *
 * @class
 */
class BlockChainIdsCache extends BaseCache {
  /**
   * Constructor for block number to chainIds cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.blockNumber = params['blockNumber'];

    oThis.consistentBehavior = '1';
    oThis.useObject = false;

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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 's_b_cid' + oThis.blockNumber;

    return oThis.cacheKey;
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
   * @returns {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      response = await new ShardByBlockModel({
        consistentRead: oThis.consistentRead
      }).getChainIds(oThis.blockNumber);

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cm_s_bcid_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(BlockChainIdsCache, coreConstants.icNameSpace, 'BlockChainIdsCache');

module.exports = BlockChainIdsCache;
