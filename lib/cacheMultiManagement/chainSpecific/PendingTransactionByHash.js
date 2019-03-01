'use strict';
/**
 * Pending transaction data by UUID cache
 *
 * @module lib/cacheMultiManagement/chainSpecific/PendingTransactionByHash
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byChainId/PendingTransaction');

/**
 * Class for pending transaction data cache
 *
 * @class
 */
class PendingTransactionByHashCache extends BaseCache {
  /**
   * Constructor for transaction data cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Array} params.transactionHashes
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.transactionHashes = params['transactionHashes'];
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
   * Set cache keys
   *
   * @returns {{}}
   */
  setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      oThis.cacheKeys[`${oThis._cacheKeyPrefix()}cs_pt_${oThis.chainId}_${oThis.transactionHashes[i].toLowerCase()}`] =
        oThis.transactionHashes[i];
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

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 3 days

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
   * @param {Array} cacheMissTransactionHashes
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissTransactionHashes) {
    const oThis = this,
      PendingTransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionModel'),
      pendingTransactionModelObject = new PendingTransactionModel({
        chainId: oThis.chainId.toString()
      });

    let response = await pendingTransactionModelObject.getPendingTransactionsWithHashes(cacheMissTransactionHashes);

    return responseHelper.successWithData(response.data);
  }

  /**
   * Set data in cache.
   *
   * @param {Object} dataToSet: indexed by uuid map of data to set in cache of each uuid
   * @returns {Result}
   */
  async setCache(dataToSet) {
    const oThis = this;

    let promises = [];

    for (let txHash in dataToSet) {
      let cacheKey = oThis.invertedCacheKeys[txHash];
      promises.push(oThis.cacheImplementer.set(cacheKey, JSON.stringify(dataToSet[txHash]), oThis.cacheExpiry));
    }

    let promiseResponses = await Promise.all(promises);

    for (let i = 0; i < promiseResponses.length; i++) {
      let response = promiseResponses[i];

      if (response.isFailure()) {
        logger.error("Couldn't set PendingTransactionByHashCache", response);
      }
    }

    return responseHelper.successWithData(promiseResponses);
  }
}

InstanceComposer.registerAsShadowableClass(
  PendingTransactionByHashCache,
  coreConstants.icNameSpace,
  'PendingTransactionByHashCache'
);

module.exports = PendingTransactionByHashCache;
