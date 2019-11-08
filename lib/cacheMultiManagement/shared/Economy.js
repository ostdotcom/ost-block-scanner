'use strict';
/**
 * Economy details cache
 *
 * @module lib/cacheMultiManagement/shared/Economy
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Economy');

/**
 * Class for economy contract address cache
 *
 * @class
 */
class EconomyCache extends BaseCache {
  /**
   * Constructor for economy contract address cache
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Array} params.economyContractAddresses
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.economyContractAddresses = params['economyContractAddresses'];
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
   * @returns {{}}
   */
  setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.economyContractAddresses.length; i++) {
      oThis.cacheKeys[
        oThis._cacheKeyPrefix() + 's_e_' + oThis.chainId + '_' + oThis.economyContractAddresses[i].toLowerCase()
      ] = oThis.economyContractAddresses[i];
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
   * @param {Array} cacheMissEconomyContractAddresses
   *
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissEconomyContractAddresses) {
    const oThis = this,
      EconomyModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyModel'),
      response = await new EconomyModel({
        consistentRead: oThis.consistentRead
      }).getEconomyData(oThis.chainId, cacheMissEconomyContractAddresses);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(EconomyCache, coreConstants.icNameSpace, 'EconomyCache');

module.exports = EconomyCache;
