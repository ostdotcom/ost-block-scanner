'use strict';
/**
 * This module will fetch basic details(balance nonce) from geth
 *
 */

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3InteractProvider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/formatter/config');

class AddressBasicDetailsFromGeth {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.address = params.address;
    oThis.gethIndex = 0;
    oThis.web3Instance = null;
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      logger.error(' In catch block of lib/address/BasicDetailsFromGeth.js');
      return responseHelper.error({
        internal_error_identifier: 'l_a_bdg_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * This method performs certain validations on the input params.
   *
   * @returns {Promise<never>}
   */
  async validateAndSanitize() {
    const oThis = this;

    if (!oThis.chainId || isNaN(oThis.chainId)) {
      logger.error('ChainId is missing');
      return responseHelper.error({
        internal_error_identifier: 'l_a_bdg_2',
        api_error_identifier: 'something_went_wrong'
      });
    }

    if (!oThis.address) {
      logger.error('Address is missing');
      return responseHelper.error({
        internal_error_identifier: 'l_a_bdg_3',
        api_error_identifier: 'something_went_wrong'
      });
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let validationResponse = await oThis.validateAndSanitize();

    if (validationResponse.isFailure()) {
      return validationResponse;
    }

    let responseHash = await oThis._fetchDataFromChain();

    return Promise.resolve(responseHelper.successWithData(responseHash));
  }

  /**
   *
   * This function fetches data from chain.
   *
   * @private
   */
  async _fetchDataFromChain() {
    const oThis = this;

    let configFormatter = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'configFormatter');
    oThis.config = configFormatter.configFor(oThis.chainId);

    let gethProviders = basicHelper.getProvidersFromNode(oThis.config.nodes),
      length = gethProviders.length,
      gethResponse = null;

    while (length--) {
      let gethNodeUrl = gethProviders[length],
        web3ProviderInstance = web3InteractProvider.getInstance(gethNodeUrl),
        promiseArray = [],
        web3Instance = web3ProviderInstance.web3WsProvider;

      promiseArray.push(
        new Promise(function(onResolve, onReject) {
          web3Instance.eth
            .getBalance(oThis.address)
            .then(function(rsp) {
              onResolve(rsp);
            })
            .catch(function(err) {
              onReject(err);
            });
        })
      );

      let val = await oThis.promisePerformer(promiseArray);

      if (val.isSuccess()) {
        gethResponse = val.data;
        break;
      }
    }

    let responseHash = {};
    responseHash[oThis.address] = {};
    if (gethResponse && gethResponse.length == 1) {
      responseHash[oThis.address] = {
        chainId: oThis.chainId,
        address: oThis.address,
        balance: gethResponse[0],
        totalTransactions: '0'
      };
    }

    return Promise.resolve(responseHash);
  }

  async promisePerformer(promiseArray) {
    return new Promise(function(onResolve, onReject) {
      Promise.all(promiseArray)
        .then(function(rsp) {
          onResolve(responseHelper.successWithData(rsp));
        })
        .catch(function(err) {
          onResolve(
            responseHelper.error({
              internal_error_identifier: 's_a_gbd_1',
              api_error_identifier: 'something_went_wrong'
            })
          );
        });
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  AddressBasicDetailsFromGeth,
  coreConstants.icNameSpace,
  'AddressBasicDetailsFromGeth'
);

module.exports = AddressBasicDetailsFromGeth;
