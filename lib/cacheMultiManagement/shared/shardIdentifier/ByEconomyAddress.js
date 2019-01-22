'use strict';
/**
 * By block cache
 *
 * @module lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');

/**
 * Class for shard by economy address cache
 *
 * @class
 */
class ShardIdentifierByEconomyAddressCache extends BaseCache {
  /**
   * Constructor for shard by economy address cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.economyContractAddress = params['economyContractAddress'];
    oThis.addresses = params['addresses'];
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
   * @returns {String}
   */
  setCacheKeys() {
    const oThis = this,
      lowerCaseEconomyAddress = oThis.economyContractAddress.toLowerCase();

    for (let i = 0; i < oThis.addresses.length; i++) {
      oThis.cacheKeys[
        `${oThis._cacheKeyPrefix()}s_si_bea_${oThis.chainId}_${lowerCaseEconomyAddress}_${oThis.addresses[
          i
        ].toLowerCase()}`
      ] = oThis.addresses[i];
    }

    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);

    return oThis.cacheKeys;
  }

  /**
   * Set cache implementer in oThis.cacheImplementer and return it
   *
   * @returns {Object}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 300; // 5 minutes

    return oThis.cacheExpiry;
  }

  /**
   * set cache implementer in oThis.cacheImplementer and return it
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
   * @param {Array} cacheMissAddresses
   *
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissAddresses) {
    const oThis = this,
      ShardByEconomyAddressModel = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel'),
      response = await new ShardByEconomyAddressModel({
        consistentRead: oThis.consistentRead
      }).getAddressesData(oThis.chainId, oThis.economyContractAddress, cacheMissAddresses);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardIdentifierByEconomyAddressCache,
  coreConstants.icNameSpace,
  'ShardIdentifierByEconomyAddressCache'
);

module.exports = ShardIdentifierByEconomyAddressCache;
