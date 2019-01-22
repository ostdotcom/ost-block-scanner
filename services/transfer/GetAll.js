'use strict';
/**
 * This service will give all the token transfer details of the transaction hash passed.
 *
 * @module services/transfer/Get
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
require(rootPrefix + '/lib/cacheManagement/chainSpecific/TransactionTokenTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');

// Define serviceType for getting signature.
const serviceType = signatureConstants.AllTransferDetails;

/**
 * Class for getting all token transfer details service
 *
 * @class
 */
class GetAllTransferDetail extends ServicesBase {
  /**
   * Constructor for getting all token transfer details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {String} transactionHash
   * @param {Object} options
   * @param {Object} options.nextPagePayload
   * @param {Object} options.nextPagePayload.LastEvaluatedKey
   * @param {Object} options.transactionHashToShardIdentifierMap
   * @param {Number} options.consistentRead
   * @param {Number} options.pageSize
   *
   * @constructor
   */
  constructor(chainId, transactionHash, options) {
    const params = { chainId: chainId, transactionHash: transactionHash, options: options };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId.toString();
    oThis.transactionHash = transactionHash;

    if (options) {
      if (options.transactionHashToShardIdentifierMap)
        oThis.transactionHashToShardIdentifierMap = options.transactionHashToShardIdentifierMap;
      if (options.pageSize) oThis.pageSize = options.pageSize || paginationLimits.AllTransferDetails;
      if (options.nextPagePayload) oThis.LastEvaluatedKey = options.nextPagePayload.LastEvaluatedKey;
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    let transactionDetails;

    if (oThis.transactionHashToShardIdentifierMap) {
      oThis.shardIdentifier = oThis.transactionHashToShardIdentifierMap[oThis.transactionHash];
    }

    if (!oThis.LastEvaluatedKey) {
      // First Page
      transactionDetails = await oThis._fetchTransfersFromCache();
    } else {
      // Other Pages
      transactionDetails = await oThis._fetchTransfersFromDb();
    }

    return Promise.resolve(transactionDetails);
  }

  /**
   * This method fetches the token transfer details for the given transaction hash.
   *
   * @returns {Promise<>}
   */
  async _fetchTransfersFromCache() {
    const oThis = this,
      paramsForTransactionTokenTransferCache = {
        chainId: oThis.chainId,
        transactionHash: oThis.transactionHash,
        shardIdentifier: oThis.shardIdentifier,
        pageSize: oThis.pageSize
      },
      TransactionTokenTransferCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TransactionTokenTransfer'),
      transactionTokenTransferCacheObj = new TransactionTokenTransferCache(paramsForTransactionTokenTransferCache),
      txHashDetails = await transactionTokenTransferCacheObj.fetch();

    if (txHashDetails.isFailure()) {
      logger.error('Error in fetching data from Transaction Token Transfer cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_trf_ga_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    return Promise.resolve(txHashDetails);
  }

  /**
   * This method fetches the token transfer details for the given transaction hash from the DB.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchTransfersFromDb() {
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
    }).getAllTransfers(oThis.transactionHash, oThis.LastEvaluatedKey);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetAllTransferDetail, coreConstants.icNameSpace, 'GetAllTransferDetail');

module.exports = GetAllTransferDetail;
