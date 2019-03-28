'use strict';
/**
 * This module will fetch basic details(balance nonce) from geth
 *
 */

const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chainSpecific/AddressBasicDetails');

// Define serviceType for getting signature.
const serviceType = serviceTypes.AddressBasicDetails;

class AddressBasicDetails extends ServicesBase {
  constructor(chainId, address) {
    const params = { chainId: chainId, address: address };
    super(params, serviceType);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.address = address;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let responseHash = await oThis._fetchDataFromCache();

    return Promise.resolve(responseHash);
  }

  /**
   *
   * This function fetches data from chain.
   *
   * @private
   */
  async _fetchDataFromCache() {
    const oThis = this;

    let AddressBasiDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBasicDetailsCache'),
      addressBasiDetails = new AddressBasiDetailsCache({ chainId: oThis.chainId, address: oThis.address }),
      addressBasicDetailsRsp = await addressBasiDetails.fetch();

    return Promise.resolve(addressBasicDetailsRsp);
  }
}

InstanceComposer.registerAsShadowableClass(AddressBasicDetails, coreConstants.icNameSpace, 'GetAddressBasicDetails');

module.exports = AddressBasicDetails;
