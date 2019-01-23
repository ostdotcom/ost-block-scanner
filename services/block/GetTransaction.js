'use strict';
/**
 * This service fetches array of transaction hashes present in a block
 *
 * @module services/block/GetTransaction
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/shared/BlockTransactions');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber');

// Define serviceType for getting signature.
const serviceType = serviceTypes.BlockTransactionHashes;

/**
 * Class for getting block transactions service
 *
 * @class
 */
class GetBlockTransaction extends ServicesBase {
  /**
   * Constructor for getting block transactions service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Number} blockNumber
   * @param {Object} options
   * @param {Object} options.nextPagePayload
   * @param {Object} options.nextPagePayload.LastEvaluatedKey
   * @param {Number} options.consistentRead
   * @param {Number} options.pageSize
   *
   * @constructor
   */
  constructor(chainId, blockNumber, options) {
    const params = { chainId: chainId, blockNumber: blockNumber };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockNumber = blockNumber;

    if (options) {
      if (options.nextPagePayload) {
        oThis.LastEvaluatedKey = options.nextPagePayload.LastEvaluatedKey;
      }
      oThis.pageSize = options.pageSize || paginationLimits.blockTransactionsLimit;
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let transactionHashesArray;

    if (!oThis.LastEvaluatedKey) {
      // First Page
      transactionHashesArray = await oThis._fetchTransactionHashesFromCache();
    } else {
      // Other Pages
      transactionHashesArray = await oThis._fetchTransactionHashesFromDb();
    }

    return Promise.resolve(transactionHashesArray);
  }

  /**
   * Returns transaction hashes from the cache.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchTransactionHashesFromCache() {
    const oThis = this,
      paramsForBlockTransactionCache = {
        chainId: oThis.chainId,
        blockNumber: oThis.blockNumber,
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      },
      BlockTransactionsCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockTransactionsCache'),
      blockTransactionCacheObj = new BlockTransactionsCacheKlass(paramsForBlockTransactionCache),
      blockTransactionsCacheRsp = await blockTransactionCacheObj.fetch();

    if (blockTransactionsCacheRsp.isFailure()) {
      logger.error('Error in fetching transactions hashes form block transactions cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_b_gtx_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return Promise.resolve(blockTransactionsCacheRsp);
  }

  /**
   * Fetch data from source
   *
   * @returns {Result}
   *
   * @private
   */
  async _fetchTransactionHashesFromDb() {
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

    const blockTimestamp = blockDetailsMap[oThis.blockNumber].blockTimestamp,
      ShardByTransactionModelClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      shardByTransactionModelObj = new ShardByTransactionModelClass({ pageSize: oThis.pageSize });

    // Fetch block transactions.
    let transactionModelResponse = await shardByTransactionModelObj.getTransactionHashesByBlockNo(
      oThis.chainId,
      blockTimestamp,
      oThis.LastEvaluatedKey
    );

    return Promise.resolve(transactionModelResponse);
  }
}

InstanceComposer.registerAsShadowableClass(GetBlockTransaction, coreConstants.icNameSpace, 'GetBlockTransaction');

module.exports = GetBlockTransaction;
