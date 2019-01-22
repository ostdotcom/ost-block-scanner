'use strict';
/**
 * This service will give token transfer details of the transaction hashes passed.
 *
 * @module services/transfer/Get
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/TokenTransfer');

// Define serviceType for getting signature.
const serviceType = signatureConstants.TransferDetails;

/**
 * Class for token transfer details service
 *
 * @class
 */
class GetTransferDetail extends ServicesBase {
  /**
   * Constructor for token transfer details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Array} transferIdentifiers: {txHash: [eventIndexes]}
   * @param {Object} options
   * @param {Object} options.transactionHashToShardIdentifierMap
   * @param {Number} options.consistentRead
   *
   * @constructor
   */
  constructor(chainId, transferIdentifiers, options) {
    const params = { chainId: chainId, transferIdentifiers: transferIdentifiers, options: options };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId.toString();
    oThis.transferIdentifiers = transferIdentifiers;

    if (options) {
      if (options.transactionHashToShardIdentifierMap)
        oThis.transactionHashToShardIdentifierMap = options.transactionHashToShardIdentifierMap;
    }
    oThis.identifiersGroupedByShardIdentifierMap = {};
    oThis.transactionHashesWithShardIdentifiers = {};
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    if (oThis.transactionHashToShardIdentifierMap) {
      oThis._fetchShardIdentifiers();
    }

    const transactionDetails = await oThis.fetchTransferDetails();

    return Promise.resolve(transactionDetails);
  }

  /**
   * Segregate transactionHashes with respect to their shardIdentifiers.
   *
   * @sets this.transactionHashToShardIdentifierMap, this.transactionHashesWithShardIdentifiers
   *
   * @private
   *
   */
  _fetchShardIdentifiers() {
    const oThis = this,
      allTransactionHashes = Object.keys(oThis.transferIdentifiers);

    for (let index = 0; index < allTransactionHashes.length; index++) {
      let transactionHash = allTransactionHashes[index];
      if (oThis.transactionHashToShardIdentifierMap[transactionHash]) {
        let shardIdentifier = oThis.transactionHashToShardIdentifierMap[transactionHash];

        oThis.identifiersGroupedByShardIdentifierMap[shardIdentifier] =
          oThis.identifiersGroupedByShardIdentifierMap[shardIdentifier] || {};
        oThis.identifiersGroupedByShardIdentifierMap[shardIdentifier][transactionHash] =
          oThis.transferIdentifiers[transactionHash];
        // The line below ensures that a transaction hash is added to the transactionHashesWithShardIdentifiers only once. The
        // value '1' has no meaningful significance.
        oThis.transactionHashesWithShardIdentifiers[transactionHash] = 1;
      }
    }
  }

  /**
   * This method fetches the token transfer details for the given transaction hashes and event indices
   *
   * @returns {Promise<>}
   */
  async fetchTransferDetails() {
    const oThis = this,
      paramsForTokenTransferCache = {
        chainId: oThis.chainId,
        transactionHashEventIndexesMap: oThis.transferIdentifiers,
        transactionHashesWithShardIdentifiers: oThis.transactionHashesWithShardIdentifiers,
        identifiersGroupedByShardIdentifierMap: oThis.identifiersGroupedByShardIdentifierMap,
        consistentRead: oThis.consistentRead
      },
      TokenTransferCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferCache'),
      tokenTransferCacheObj = new TokenTransferCache(paramsForTokenTransferCache),
      txHashDetails = await tokenTransferCacheObj.fetch();

    if (txHashDetails.isFailure()) {
      logger.error('Error in fetching data from Token Transfer cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_trf_g_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(txHashDetails);
  }
}

InstanceComposer.registerAsShadowableClass(GetTransferDetail, coreConstants.icNameSpace, 'GetTransferDetail');

module.exports = GetTransferDetail;
