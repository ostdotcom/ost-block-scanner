'use strict';
/**
 * Transaction details from chain to be cached
 *
 * @module lib/cacheMultiManagement/chainSpecific/TransactionDetailFromGeth
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/formatter/config');

/**
 * Class for transaction details data by hash cache
 *
 * @class
 */
class TransactionDetailFromGethCache extends BaseCache {
  /**
   * Constructor for transaction details data by hash cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Array} params.transactionHashes
   * @param {Object} params.txHashToShardIdentifierMap
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
      oThis.cacheKeys[
        `${oThis._cacheKeyPrefix()}cs_tdfg_${oThis.chainId}_${oThis.transactionHashes[i].toLowerCase()}`
      ] = oThis.transactionHashes[i];
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

    oThis.cacheExpiry = 1800; // 30 minutes

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
      transactionHashesData = {},
      configFormatter = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'configFormatter'),
      config = configFormatter.configFor(oThis.chainId),
      providers = basicHelper.getProvidersFromNode(config.nodes);

    let index = 1;
    while (true) {
      const offset = (index - 1) * 20,
        batchedTrxHashes = cacheMissTransactionHashes.slice(offset, 20 + offset),
        provider_ind = index % providers.length,
        provider = providers[provider_ind];

      if (batchedTrxHashes.length <= 0) {
        break;
      }

      const trxResponse = await oThis._getTxInfoForBatch(batchedTrxHashes, provider);
      Object.assign(transactionHashesData, trxResponse);
      index++;
    }

    return Promise.resolve(responseHelper.successWithData(transactionHashesData));
  }

  /**
   * Get transaction information from Chain
   *
   * @param batchedTxHashes
   * @param provider
   * @returns {Promise<any>}
   * @private
   */
  async _getTxInfoForBatch(batchedTxHashes, provider) {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const totalCount = batchedTxHashes.length;

      let count = 0,
        txHashToTxDetailsMap = {};

      const requestCallback = function(err, result) {
        if (err) {
          return onReject(err);
        }

        count++;
        if (result) {
          txHashToTxDetailsMap[result.hash] = result;
        }

        if (count === totalCount) {
          return onResolve(txHashToTxDetailsMap);
        }
      };

      let web3Interact = web3InteractFactory.getInstance(provider),
        batch = new web3Interact.web3WsProvider.BatchRequest();

      for (let i = 0; i < batchedTxHashes.length; i++) {
        let transactionHash = batchedTxHashes[i];

        let getTransactionRequest = web3Interact.web3WsProvider.eth.getTransaction.request(
          transactionHash,
          requestCallback
        );

        batch.add(getTransactionRequest);
      }

      batch.execute();
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  TransactionDetailFromGethCache,
  coreConstants.icNameSpace,
  'TransactionDetailFromGethCache'
);

module.exports = TransactionDetailFromGethCache;
