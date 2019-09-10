/**
 * Latest price points cache.
 *
 * @module lib/cacheManagement/shared/LatestPricePoints
 */
const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/LatestPricePoint');

/**
 * Class for latest price points cache.
 *
 * @class LatestPricePointsCache
 */
class LatestPricePointsCache extends BaseCache {
  /**
   * Constructor for latest price points cache.
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'l_cm_s_lpp';

    return oThis.cacheKey;
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
   * @returns {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      LatestPricePointModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'LatestPricePointModel'),
      response = await new LatestPricePointModel({
        consistentRead: oThis.consistentRead
      }).getPricePoints();

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(LatestPricePointsCache, coreConstants.icNameSpace, 'LatestPricePointsCache');

module.exports = {};
