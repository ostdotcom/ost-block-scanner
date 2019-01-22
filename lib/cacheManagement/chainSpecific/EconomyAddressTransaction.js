'use strict';
/**
 * Transaction hashes by address cache
 *
 * @module lib/cacheManagement/chainSpecific/EconomyAddressTransaction
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');

/**
 * Class for transaction hashes by address cache
 *
 * @class
 */
class EconomyAddressTransactionCache extends BaseCache {
  /**
   * Constructor for transaction hashes by address cache
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {String} params.economyContractAddress
   * @param {String} params.address
   * @param {String} params.shardIdentifier
   * @param {Number} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.economyContractAddress = params['economyContractAddress'];
    oThis.address = params['address'];
    oThis.shardIdentifier = params['shardIdentifier'];
    oThis.consistentBehavior = '1';
    oThis.useObject = true;
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

    oThis.cacheKey = `${oThis._cacheKeyPrefix()}_cs_atxtin_${
      oThis.chainId
    }_${oThis.economyContractAddress.toLowerCase()}_${oThis.address.toLowerCase()}_size_${oThis.pageSize}`;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    // NOTE: block scanner does not clear this cache, so setting it to a lower value to avoid representation layer inconsistencies.
    oThis.cacheExpiry = 60; // 60 seconds

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
   * @returns {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      EconomyAddressTransaction = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransactionModel');

    // If shardIdentifier is unavailable.
    if (!oThis.shardIdentifier) {
      const ShardIdentifierByEconomyAddressCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
        getShardRsp = await new ShardIdentifierByEconomyAddressCache({
          economyContractAddress: oThis.economyContractAddress,
          addresses: [oThis.address],
          chainId: oThis.chainId,
          consistentRead: oThis.consistentRead
        }).fetch();

      if (!getShardRsp.data[oThis.address] || !getShardRsp.data[oThis.address]['shardIdentifier']) {
        // This address hasn't been allocated a shard.
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_cm_cs_eatx_1',
            api_error_identifier: 'invalid_address',
            debug_options: { getShardRsp: getShardRsp }
          })
        );
      }
      oThis.shardIdentifier = getShardRsp.data[oThis.address]['shardIdentifier'];
    }

    let response = await new EconomyAddressTransaction({
      chainId: oThis.chainId,
      shardIdentifier: oThis.shardIdentifier,
      pageSize: oThis.pageSize
    }).getRecentTransactionHashes(oThis.address, oThis.economyContractAddress);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  EconomyAddressTransactionCache,
  coreConstants.icNameSpace,
  'EconomyAddressTransactionCache'
);

module.exports = EconomyAddressTransactionCache;
