'use strict';
/**
 * This service fetches the recent transactions of a chain
 *
 * @module services/chain/GetTransaction
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/cacheManagement/shared/RecentTransactionsByChain');

// Define serviceType for getting signature.
const serviceType = serviceTypes.ChainTransactions;

/**
 * Class for chain transactions service
 *
 * @class
 */
class GetChainTransaction extends ServicesBase {
  /**
   * Constructor for chain transactions service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Object} options
   * @param {Object} options.nextPagePayload
   * @param {Object} options.nextPagePayload.LastEvaluatedKey
   * @param {Number} options.consistentRead
   * @param {Number} options.pageSize
   *
   * @constructor
   */
  constructor(chainId, options) {
    const params = { chainId: chainId };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;

    if (options) {
      if (options.nextPagePayload) {
        if (options.nextPagePayload.LastEvaluatedKey) oThis.nextPagePayload = options.nextPagePayload.LastEvaluatedKey;
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

    let recentChainTransactions = {};

    if (!oThis.nextPagePayload) {
      recentChainTransactions = await oThis._fetchTransactionsFromCache();
    } else {
      recentChainTransactions = await oThis._fetchTransactionsFromDb();
    }

    return Promise.resolve(recentChainTransactions);
  }

  /**
   * This method fetches the recent transactions for a chainId from cache for page number 1.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchTransactionsFromCache() {
    const oThis = this,
      RecentTransactionsByChainCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RecentTransactionsByChainCache'),
      response = await new RecentTransactionsByChainCacheClass({
        chainId: oThis.chainId,
        consistentRead: oThis.consistentRead,
        LastEvaluatedKey: oThis.nextPagePayload,
        pageSize: oThis.pageSize
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching recent transactions of chain from cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_c_gtx_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { response: response }
        })
      );
    }

    return Promise.resolve(response);
  }

  /**
   * This method fetches the recent transactions for a chainId from the db.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchTransactionsFromDb() {
    const oThis = this,
      ShardByTransaction = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      response = await new ShardByTransaction({
        pageSize: oThis.pageSize
      }).getRecentTransactionHashes(oThis.chainId, oThis.nextPagePayload);

    if (response.isFailure()) {
      logger.error('Error in fetching recent transactions of chain from db');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_c_gtx_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { response: response }
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetChainTransaction, coreConstants.icNameSpace, 'GetChainTransaction');

module.exports = GetChainTransaction;
