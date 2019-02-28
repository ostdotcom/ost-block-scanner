'use strict';
/**
 * This service fetches contract details for a set of contract addresses
 *
 * @module services/contract/Get
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
require(rootPrefix + '/lib/cacheMultiManagement/shared/Economy');

// Define serviceType for getting signature.
const serviceType = serviceTypes.ContractAddressDetails;

/**
 * Class for contract address details service
 *
 * @class
 */
class GetContractDetail extends ServicesBase {
  /**
   * Constructor for contract address details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Array} contractAddresses
   * @param {Object} options
   * @param {Number} options.consistentRead
   *
   * @constructor
   */
  constructor(chainId, contractAddresses, options) {
    const params = { chainId: chainId, contractAddresses: contractAddresses };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.contractAddresses = contractAddresses;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      contractAddressDetails = await oThis._fetchContractAddressDetails();

    return Promise.resolve(contractAddressDetails);
  }

  /**
   * This method fetches the contract details for the contract addresses being passed.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchContractAddressDetails() {
    const oThis = this,
      EconomyCacheClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache'),
      response = await new EconomyCacheClass({
        chainId: oThis.chainId,
        economyContractAddresses: oThis.contractAddresses,
        consistentRead: oThis.consistentRead
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from economy details cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_co_g_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetContractDetail, coreConstants.icNameSpace, 'GetContractDetail');

module.exports = GetContractDetail;
