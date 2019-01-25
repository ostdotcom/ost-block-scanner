'use strict';
/**
 * This service will give extended transactions details of the transaction hashes passed.
 *
 * @module services/transaction/GetExtended
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/TransactionDetail');

// Define serviceType for getting signature.
const serviceType = serviceTypes.TransactionExtendedDetails;

/**
 * Class for extended transaction details service
 *
 * @class
 */
class GetTransactionExtendedDetail extends ServicesBase {
  /**
   * Constructor for extended transaction details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Array} transactionHashes
   * @param {Object} options
   * @param {Object} options.transactionHashToShardIdentifierMap
   * @param {Number} options.consistentRead
   *
   * @constructor
   */
  constructor(chainId, transactionHashes, options) {
    const params = { chainId: chainId, transactionHashes: transactionHashes, options: options };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId.toString();
    oThis.transactionHashes = transactionHashes;

    if (options) {
      if (options.transactionHashToShardIdentifierMap) {
        oThis.transactionHashToShardIdentifierMap = options.transactionHashToShardIdentifierMap;
      }
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      transactionDetails = await oThis.fetchTransactionDetails();

    return Promise.resolve(transactionDetails);
  }

  /**
   * This method fetches the extended transaction details for the given transaction hashes
   *
   * @returns {Promise<*>}
   */
  async fetchTransactionDetails() {
    const oThis = this,
      paramsForTransaction = {
        chainId: oThis.chainId,
        transactionHashes: oThis.transactionHashes,
        transactionHashToShardIdentifierMap: oThis.transactionHashToShardIdentifierMap,
        consistentRead: oThis.consistentRead
      },
      TransactionDetailCacheClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailCache'),
      transactionDetailCacheObj = new TransactionDetailCacheClass(paramsForTransaction),
      transactionHashDetails = await transactionDetailCacheObj.fetch();

    if (transactionHashDetails.isFailure()) {
      logger.error('Error in fetching data from Transaction cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_ge_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(transactionHashDetails);
  }
}

InstanceComposer.registerAsShadowableClass(
  GetTransactionExtendedDetail,
  coreConstants.icNameSpace,
  'GetTransactionExtendedDetail'
);

module.exports = GetTransactionExtendedDetail;
