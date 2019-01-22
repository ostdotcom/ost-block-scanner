'use strict';
/**
 * All token transfers by transaction hash cache
 *
 * @module lib/cacheManagement/chainSpecific/TransactionTokenTransfer
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byTransaction/TokenTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');

/**
 * Class for all token transfers by transaction hash cache
 *
 * @class
 */
class TransactionTokenTransfer extends BaseCache {
  /**
   * Constructor for all token transfers by transaction hash cache
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {String} params.transactionHash
   * @param {String} params.shardIdentifier
   * @param {Number} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.transactionHash = params['transactionHash'];
    oThis.shardIdentifier = params['shardIdentifier'];
    oThis.pageSize = params['pageSize'];
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

    oThis.cacheKey = `${oThis._cacheKeyPrefix()}_cs_attt_${oThis.chainId}_${oThis.transactionHash.toLowerCase()}_size_${
      oThis.pageSize
    }`;

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
      TokenTransferModelClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel');

    // If shardIdentifier is unavailable.
    if (!oThis.shardIdentifier) {
      let ShardIdentifierByTransactionCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache'),
        getShardRsp = await new ShardIdentifierByTransactionCache({
          chainId: oThis.chainId,
          transactionHashes: [oThis.transactionHash],
          consistentRead: oThis.consistentRead
        }).fetch();

      if (getShardRsp.isFailure()) {
        return Promise.reject(getShardRsp);
      }

      oThis.shardIdentifier = getShardRsp.data[oThis.transactionHash]['shardIdentifier'];
    }

    let response = await new TokenTransferModelClass({
      chainId: oThis.chainId,
      shardIdentifier: oThis.shardIdentifier,
      pageSize: oThis.pageSize
    }).getAllTransfers(oThis.transactionHash);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(
  TransactionTokenTransfer,
  coreConstants.icNameSpace,
  'TransactionTokenTransfer'
);

module.exports = TransactionTokenTransfer;
