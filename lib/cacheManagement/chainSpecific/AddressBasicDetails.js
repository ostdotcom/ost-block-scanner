'use strict';
/**
 * Address basic details
 *
 * @module lib/cacheManagement/chainSpecific/AddressBasicDetails
 */
const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/address/BasicDetailsFromGeth');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');

/**
 * Class for transaction hashes by address cache
 *
 * @class
 */
class AddressBasicDetailsCache extends BaseCache {
  /**
   * Constructor for address basic details by address cache
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
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
    oThis.address = params['address'];
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

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

    oThis.cacheKey = `${oThis._cacheKeyPrefix()}_ad_bd_${oThis.address.toLowerCase()}`;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 300; // 5 minutes

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
      AddressBasicDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBasicDetailsFromGeth');

    let params = {
        chainId: oThis.chainId,
        address: oThis.address
      },
      addressBasicDetails = new AddressBasicDetails(params),
      addressBasicDetailsRsp = await addressBasicDetails.perform();

    // Fetch basic data of address
    const ShardIdentifierByEconomyAddrCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
      getShardRsp = await new ShardIdentifierByEconomyAddrCache({
        chainId: oThis.chainId,
        economyContractAddress: '0x0',
        addresses: [oThis.address],
        consistentRead: 0
      }).fetch();

    let totalTransactions = 0;
    if (getShardRsp.isSuccess()) {
      let addrData = getShardRsp.data[oThis.address.toLowerCase()] || {};
      totalTransactions = addrData.totalTransactionsOrTransfers || 0;
    }

    Object.assign(addressBasicDetailsRsp.data[oThis.address], { totalTransactions: totalTransactions });

    return Promise.resolve(addressBasicDetailsRsp);
  }
}

InstanceComposer.registerAsShadowableClass(
  AddressBasicDetailsCache,
  coreConstants.icNameSpace,
  'AddressBasicDetailsCache'
);

module.exports = AddressBasicDetailsCache;
