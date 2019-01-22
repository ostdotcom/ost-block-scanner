'use strict';
/**
 * By block cache
 *
 * @module lib/cacheMultiManagement/chainSpecific/AddressBalance
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');
require(rootPrefix + '/services/chainInteractions/fetchAddressTokenBalance');
require(rootPrefix + '/lib/formatter/config');

/**
 * Class for address balance cache
 *
 * @class
 */
class AddressBalanceCache extends BaseCache {
  /**
   * Constructor for address balance cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.economyContractAddress = params['economyContractAddress'].toLowerCase();
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
    const oThis = this;
    let address;

    for (let i = 0; i < oThis.addresses.length; i++) {
      address = oThis.addresses[i].toLowerCase();
      oThis.cacheKeys[`${oThis._cacheKeyPrefix()}cs_ab_${oThis.chainId}_${oThis.economyContractAddress}_${address}`] =
        oThis.addresses[i];
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
   * @param {Array} cacheMissAddresses
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissAddresses) {
    const oThis = this;

    // Fetch basic data of address
    const ShardIdentifierByEconomyAddrCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
      getShardRsp = await new ShardIdentifierByEconomyAddrCache({
        chainId: oThis.chainId,
        economyContractAddress: oThis.economyContractAddress,
        addresses: cacheMissAddresses,
        consistentRead: false
      }).fetch();

    // Fetch Token balance from chain
    const fetchAddrBalanceKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'FetchAddressTokenBalance');
    let promisesArr = [],
      provider = oThis._getProviderFromChain(),
      addressesBalance = {};
    for (let i = 0; i < cacheMissAddresses.length; i++) {
      promisesArr.push(
        new fetchAddrBalanceKlass({
          contractAddress: oThis.economyContractAddress,
          address: cacheMissAddresses[i],
          provider: provider
        })
          .perform()
          .then(function(resp) {
            if (resp.isSuccess()) {
              addressesBalance[cacheMissAddresses[i]] = resp.data.addressTokenBalance;
            }
          })
      );
    }
    await Promise.all(promisesArr);

    for (let addr in getShardRsp.data) {
      let bal = addressesBalance[addr] || 0;
      Object.assign(getShardRsp.data[addr], { balance: bal });
    }

    return getShardRsp;
  }

  /**
   * This function returns the provider for chain
   *
   * @returns {Promise<void>}
   */
  _getProviderFromChain() {
    const oThis = this,
      configFormatter = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'configFormatter'),
      config = configFormatter.configFor(oThis.chainId);

    let providers = basicHelper.getProvidersFromNode(config.nodes);

    return providers[0];
  }
}

InstanceComposer.registerAsShadowableClass(AddressBalanceCache, coreConstants.icNameSpace, 'AddressBalanceCache');

module.exports = AddressBalanceCache;
