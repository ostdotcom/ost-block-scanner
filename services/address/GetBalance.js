'use strict';
/**
 * This service fetches balance of user addresses
 *
 * @module services/address/GetBalance
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
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/AddressBalance');

// Define serviceType for getting signature.
const serviceType = serviceTypes.AddressBalance;

/**
 * Class for non contract address balance service
 *
 * @class
 */
class GetAddressBalance extends ServicesBase {
  /**
   * Constructor for non contract address balance service
   *
   * @augments ServicesBase
   * @param {Number} chainId
   * @param {String} contractAddress
   * @param {Array} userAddresses
   * @param {Object} options
   * @constructor
   */
  constructor(chainId, contractAddress, userAddresses, options) {
    const params = { chainId: chainId, contractAddress: contractAddress, userAddresses: userAddresses };
    super(params, serviceType);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.contractAddress = contractAddress;
    oThis.userAddresses = userAddresses;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      userAddressesBalance = await oThis._fetchUserAddressesBalance();

    return Promise.resolve(userAddressesBalance);
  }

  /**
   * This method fetches the user address balance for the passed user addresses.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchUserAddressesBalance() {
    const oThis = this,
      AddressBalanceCacheClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBalanceCache'),
      response = await new AddressBalanceCacheClass({
        chainId: oThis.chainId,
        economyContractAddress: oThis.contractAddress,
        addresses: oThis.userAddresses,
        consistentRead: oThis.consistentRead
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from address balance cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_a_gb_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let formattedResponse = {};
    for (let i = 0; i < oThis.userAddresses.length; i++) {
      let addr = oThis.userAddresses[i],
        balanceResp = response.data[addr] || {};
      formattedResponse[addr] = {
        contractAddress: oThis.contractAddress,
        address: addr,
        balance: balanceResp.balance || 0,
        chainId: oThis.chainId,
        totalTokenTransfers: balanceResp.totalTransactionsOrTransfers || 0
      };
    }

    return Promise.resolve(responseHelper.successWithData(formattedResponse));
  }
}

InstanceComposer.registerAsShadowableClass(GetAddressBalance, coreConstants.icNameSpace, 'GetAddressBalance');

module.exports = GetAddressBalance;
