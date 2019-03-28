'use strict';
/**
 * This service creates a new economy.
 *
 * @module services/economy/Create
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/transactionParser/CreateEconomy');

// Define serviceType for getting signature.
const serviceType = serviceTypes.CreateEconomy;

/**
 * Class for creating a new economy.
 *
 * @class
 */
class CreateEconomyService extends ServicesBase {
  /**
   * Constructor for creating a new economy.
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Number} decimals
   * @param {String} contractAddress
   * @param {String} gatewayContractAddress
   * @param {String} provider
   * @param {Number} blockTimestamp
   * @param {String} displayName
   * @param {String} conversionFactor
   * @param {String} symbol
   * @param {String} originContractAddress
   * @constructor
   */
  constructor(
    chainId,
    decimals,
    contractAddress,
    gatewayContractAddress,
    provider,
    blockTimestamp,
    displayName,
    conversionFactor,
    symbol,
    originContractAddress
  ) {
    const params = {
      chainId: chainId,
      decimals: decimals,
      contractAddress: contractAddress,
      gatewayContractAddress: gatewayContractAddress,
      provider: provider,
      blockTimestamp: blockTimestamp,
      displayName: displayName,
      conversionFactor: conversionFactor,
      symbol: symbol,
      originContractAddress: originContractAddress
    };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.decimals = decimals;
    oThis.contractAddress = contractAddress;
    oThis.provider = provider;
    oThis.gatewayContractAddress = gatewayContractAddress;
    oThis.blockTimestamp = blockTimestamp;
    oThis.displayName = displayName;
    oThis.conversionFactor = conversionFactor;
    oThis.symbol = symbol;
    oThis.originContractAddress = originContractAddress;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let response = await oThis._createEconomy();

    return Promise.resolve(response);
  }

  /**
   * Create economy.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _createEconomy() {
    const oThis = this,
      createEconomyKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CreateEconomy'),
      mandatoryParams = {
        contractAddress: oThis.contractAddress,
        chainId: oThis.chainId,
        provider: oThis.provider,
        ignoreErc20Validations: 1,
        blockTimestamp: oThis.blockTimestamp,
        isUpdate: 0
      },
      optionalParams = {
        decimals: oThis.decimals,
        displayName: oThis.displayName,
        conversionFactor: oThis.conversionFactor,
        symbol: oThis.symbol,
        gatewayContractAddress: oThis.gatewayContractAddress,
        originContractAddress: oThis.originContractAddress
      },
      createEconomyObj = new createEconomyKlass(mandatoryParams, optionalParams);

    await createEconomyObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(CreateEconomyService, coreConstants.icNameSpace, 'CreateEconomyService');

module.exports = CreateEconomyService;
