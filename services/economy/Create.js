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
   * @param {Object} economyParams
   * @param {Object} extraStorageParams
   * @param {Number} blockTimestamp
   * @param {String} provider
   * @param {Number} economyParams.chainId
   * @param {Number} economyParams.decimals
   * @param {String} economyParams.contractAddress
   * @param {String} economyParams.displayName
   * @param {String} economyParams.conversionFactor
   * @param {String} economyParams.symbol
   * @param {String} extraStorageParams.gatewayContractAddress
   * @param {String} extraStorageParams.originContractAddress
   *
   * @constructor
   */
  constructor(economyParams, extraStorageParams, blockTimestamp, provider) {
    const params = {
      chainId: economyParams.chainId,
      decimals: economyParams.decimals,
      contractAddress: economyParams.contractAddress,
      provider: provider,
      displayName: economyParams.displayName,
      conversionFactor: economyParams.conversionFactor,
      symbol: economyParams.symbol,
      blockTimestamp: blockTimestamp
    };

    Object.assign(params, extraStorageParams);

    super(params, serviceType);

    const oThis = this;

    oThis.chainId = economyParams.chainId;
    oThis.decimals = economyParams.decimals;
    oThis.contractAddress = economyParams.contractAddress;
    oThis.displayName = economyParams.displayName;
    oThis.conversionFactor = economyParams.conversionFactor;
    oThis.symbol = economyParams.symbol;
    oThis.provider = provider;
    oThis.blockTimestamp = blockTimestamp;
    oThis.extraStorageParams = extraStorageParams;
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
        symbol: oThis.symbol
      },
      createEconomyObj = new createEconomyKlass(mandatoryParams, oThis.extraStorageParams, optionalParams);

    await createEconomyObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(CreateEconomyService, coreConstants.icNameSpace, 'CreateEconomyService');

module.exports = CreateEconomyService;
