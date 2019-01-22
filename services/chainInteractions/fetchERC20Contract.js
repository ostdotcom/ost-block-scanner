'use strict';
/**
 * This service receives transaction receipt and fetches ERC20 contract details if its a contract deployment
 *
 * @module services/transactionsParser/registerERC20Contract
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  sanitizer = require(rootPrefix + '/lib/sanitizers/common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  mockAbi = require(rootPrefix + '/config/genericData/mockERC20ContractAbi.json'),
  errorConfig = basicHelper.getErrorConfig();

/**
 * Class for fetching ERC20 contract address
 *
 * @class
 */
class FetchERC20Contract {
  /**
   * Constructor for fetching ERC20 contract address
   *
   * @param  {String} params.contractAddress: Contract Address to fetch details for.
   * @param {String} params.provider: Provider to use for contract fetching
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.contractAddress = params.contractAddress;
    oThis.provider = params.provider;
    oThis.contractDetails = {};
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/transactionsParser/registerERC20Contract');
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

    await oThis._fetchContractInfo(oThis.contractAddress);

    return Promise.resolve(
      responseHelper.successWithData({
        contractDetails: oThis.contractDetails
      })
    );
  }

  async _fetchContractInfo(contractAddress) {
    const oThis = this;

    let web3Interact = await web3InteractFactory.getInstance(oThis.provider),
      mockContractObj = await web3Interact.getContractObject(mockAbi, contractAddress);

    let promisesArray = [];

    promisesArray.push(
      new Promise(function(onResolve, onReject) {
        mockContractObj.methods
          .name()
          .call({})
          .then(function(name) {
            oThis.contractDetails['name'] = sanitizer.sanitizeString(name);
            onResolve();
          })
          .catch(function(err) {
            onResolve();
          });
      })
    );

    promisesArray.push(
      new Promise(function(onResolve, onReject) {
        mockContractObj.methods
          .symbol()
          .call({})
          .then(function(symbol) {
            oThis.contractDetails['symbol'] = sanitizer.sanitizeString(symbol);
            onResolve();
          })
          .catch(function(err) {
            onResolve();
          });
      })
    );

    promisesArray.push(
      new Promise(function(onResolve, onReject) {
        mockContractObj.methods
          .totalSupply()
          .call({})
          .then(function(totalSupply) {
            oThis.contractDetails['totalSupply'] = sanitizer.sanitizeNumber(totalSupply);
            onResolve();
          })
          .catch(function(err) {
            onResolve();
          });
      })
    );

    promisesArray.push(
      new Promise(function(onResolve, onReject) {
        mockContractObj.methods
          .decimals()
          .call({})
          .then(function(decimals) {
            oThis.contractDetails['decimals'] = sanitizer.sanitizeNumber(decimals);
            onResolve();
          })
          .catch(function(err) {
            onResolve();
          });
      })
    );

    await Promise.all(promisesArray);
  }
}

InstanceComposer.registerAsShadowableClass(FetchERC20Contract, coreConstants.icNameSpace, 'FetchERC20Contract');
