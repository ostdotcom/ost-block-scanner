'use strict';
/**
 * This service fetches the recent blocks of a chain
 *
 * @module services/chain/GetBlock
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/cacheManagement/shared/RecentBlockNumbers');

// Define serviceType for getting signature.
const serviceType = signatureConstants.ChainBlocks;

/**
 * Class for chain blocks service
 *
 * @class
 */
class GetChainBlock extends ServicesBase {
  /**
   * Constructor for chain blocks service
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
      oThis.pageSize = options.pageSize || paginationLimits.recentBlocksLimit;
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let recentBlocks = {};

    if (!oThis.nextPagePayload) {
      recentBlocks = await oThis._fetchBlocksFromCache();
    } else {
      recentBlocks = await oThis._fetchBlocksFromDb();
    }

    return Promise.resolve(recentBlocks);
  }

  /**
   * This method fetches the recent blocks for a chainId from cache for page number 1.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchBlocksFromCache() {
    const oThis = this,
      RecentBlockNumbersCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RecentBlockNumbersCache'),
      response = await new RecentBlockNumbersCacheClass({
        chainId: oThis.chainId,
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching recent blocks of chain from cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_c_gb_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { response: response }
        })
      );
    }

    return Promise.resolve(response);
  }

  /**
   * This method fetches the recent blocks for a chainId from the db.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchBlocksFromDb() {
    const oThis = this,
      ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      response = await new ShardByBlockModel({
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      }).getRecentBlocks(oThis.chainId, oThis.nextPagePayload);

    if (response.isFailure()) {
      logger.error('Error in fetching recent blocks of chain from db');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_c_gb_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { response: response }
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetChainBlock, coreConstants.icNameSpace, 'GetChainBlock');

module.exports = GetChainBlock;
