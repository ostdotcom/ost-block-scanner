'use strict';
/**
 * Transactions in a block cache
 *
 * @module lib/cacheManagement/shared/BlockTransactions
 */
const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCache = require(rootPrefix + '/lib/cacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber');

/**
 * Class for transactions in a block cache
 *
 * @class
 */
class BlockTransactionsCache extends BaseCache {
  /**
   * Constructor
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Number} params.blockNumber
   * @param {Number} params.pageSize
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.blockNumber = params['blockNumber'];
    oThis.consistentBehavior = '1';
    oThis.useObject = false;

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
   * @returns {Object}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey =
      oThis._cacheKeyPrefix() + 's_bk_txs_' + oThis.chainId + '_' + oThis.blockNumber + '_size_' + oThis.pageSize;

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
    // Fetch blockData.
    const oThis = this,
      BlockDataByBlockNoCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'BlockDataByBlockNoCache'),
      response = await new BlockDataByBlockNoCacheClass({
        chainId: oThis.chainId,
        blockNumbers: [oThis.blockNumber],
        consistentRead: oThis.consistentRead
      }).fetch(),
      blockDetailsMap = response.data;

    if (basicHelper.isEmptyObject(blockDetailsMap[oThis.blockNumber])) {
      return responseHelper.successWithData({
        transactionHashes:[],
        nextPagePayload: {}
      });
    }

    const ShardByTransactionModelClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      ShardByTransactionModelObj = new ShardByTransactionModelClass({
        pageSize: oThis.pageSize
      });

    // Fetch block transactions.
    let blockTimestamp = blockDetailsMap[oThis.blockNumber].blockTimestamp,
      transactionModelResponse = await ShardByTransactionModelObj.getTransactionHashesByBlockNo(
        oThis.chainId,
        blockTimestamp
      );

    return transactionModelResponse;
  }
}

InstanceComposer.registerAsShadowableClass(BlockTransactionsCache, coreConstants.icNameSpace, 'BlockTransactionsCache');

module.exports = BlockTransactionsCache;
