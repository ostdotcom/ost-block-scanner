'use strict';
/**
 * This service receives transaction receipt and fetches ERC20 contract details if its a contract deployment
 *
 * @module services/transactionsParser/registerERC20Contract
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  sanitizer = require(rootPrefix + '/lib/sanitizers/common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  erc20Abi = require(rootPrefix + '/config/abi/erc20Abi.json'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class for fetching ERC20 contract address
 *
 * @class
 */
class FetchAddressTokenBalance {
  /**
   * Constructor for fetching ERC20 contract address
   *
   * @param  {String} params.contractAddress: Contract Address to fetch details for.
   * @param  {String} params.address: Address to fetch balance of.
   * @param {String} params.provider: Provider to use for contract fetching
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.contractAddress = params.contractAddress;
    oThis.address = params.address;
    oThis.provider = params.provider;
    oThis.addressTokenBalance = 0;
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/chainInteractions/fetchAddressTokenBalance');
      return responseHelper.error({
        internal_error_identifier: 's_tp_rec_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  async asyncPerform() {
    const oThis = this;

    await oThis._fetchAddressBalance();

    return Promise.resolve(
      responseHelper.successWithData({
        addressTokenBalance: oThis.addressTokenBalance
      })
    );
  }

  async _fetchAddressBalance() {
    const oThis = this;

    let web3Interact = await web3InteractFactory.getInstance(oThis.provider),
      erc20 = await web3Interact.getContractObject(erc20Abi, oThis.contractAddress);

    let promise = new Promise(function(onResolve, onReject) {
      erc20.methods
        .balanceOf(oThis.address)
        .call({})
        .then(function(balance) {
          oThis.addressTokenBalance = sanitizer.sanitizeString(balance);
          onResolve();
        })
        .catch(function(err) {
          onResolve();
        });
    });

    return promise;
  }
}

InstanceComposer.registerAsShadowableClass(
  FetchAddressTokenBalance,
  coreConstants.icNameSpace,
  'FetchAddressTokenBalance'
);
