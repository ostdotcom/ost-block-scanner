'use strict';
/**
 * This service fetches token transfers details of given transaction hashes.
 *
 * @module services/transfer/GetAll
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/Transaction');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/TokenTransfer');

// Define serviceType for getting signature.
const serviceType = serviceTypes.AllTransferDetails;
const ddbQueryBatchSize = 30;

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
   * @param {Array} transactionHashes
   *
   * @constructor
   */
  constructor(chainId, transactionHashes) {
    const params = { chainId: chainId, transactionHashes: transactionHashes };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId.toString();
    oThis.transactionHashes = transactionHashes;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    let transactionDetails = await oThis._fetchTransactionDetails();

    const transactionTransferDetails = await oThis._fetchTokenTransfers(transactionDetails.data);

    return responseHelper.successWithData(transactionTransferDetails);
  }

  /**
   * Fetch Token transfers for transaction details.
   *
   * @param transactionDetails
   * @returns {Promise<never>}
   * @private
   */
  async _fetchTokenTransfers(transactionDetails) {
    const oThis = this;

    const transactionEventMap = {};
    for (let txHash in transactionDetails) {
      for (let i = 1; i <= transactionDetails[txHash].totalTokenTransfers; i++) {
        transactionEventMap[txHash] = transactionEventMap[txHash] || [];
        transactionEventMap[txHash].push(i);
      }
    }

    let TransferCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferCache');

    let transfersResponse = await new TransferCache({
      chainId: oThis.chainId,
      transactionHashEventIndexesMap: transactionEventMap,
      consistentRead: oThis.consistentRead
    }).fetch();

    if (transfersResponse.isFailure()) {
      logger.error('Error in fetching data from Token transfers cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_ga_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    const transactionTransferDetails = {};
    for (let txHash in transfersResponse.data) {
      transactionTransferDetails[txHash] = transfersResponse.data[txHash].transfers;
    }

    return transactionTransferDetails;
  }

  /**
   * This method fetches the transaction details for the given transaction hashes
   *
   * @returns {Promise<*>}
   */
  async _fetchTransactionDetails() {
    const oThis = this,
      paramsForTxHashToDetailsCache = {
        chainId: oThis.chainId,
        transactionHashes: oThis.transactionHashes,
        consistentRead: oThis.consistentRead
      },
      TxHashToDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionCache'),
      TxHashToDetailsCacheObj = new TxHashToDetailsCache(paramsForTxHashToDetailsCache),
      txHashDetails = await TxHashToDetailsCacheObj.fetch();

    if (txHashDetails.isFailure()) {
      logger.error('Error in fetching data from Transaction cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_ga_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(txHashDetails);
  }
}

InstanceComposer.registerAsShadowableClass(GetAllTransferDetail, coreConstants.icNameSpace, 'GetAllTransferDetail');

module.exports = GetAllTransferDetail;
