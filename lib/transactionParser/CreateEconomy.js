'use strict';
/**
 * This module creates entry in Economy and shardByEconomy table.
 *
 * @module lib/transactionParser/CreateEconomy
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  sanitizer = require(rootPrefix + '/lib/sanitizers/common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  errorConfig = basicHelper.getErrorConfig();

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Economy');
require(rootPrefix + '/services/chainInteractions/fetchERC20Contract');

/**
 * Class to create entry in economies table.
 *
 * @class
 */
class CreateEconomy {
  /**
   * Constructor to create entry in economies table.
   *
   * @param {Object} params
   * @param {String} params.contractAddress
   * @param {Number} params.chainId
   * @param {String} params.provider
   * @param {Number} params.ignoreErc20Validations
   * @param {Number} params.blockTimestamp
   * @param {Number} params.isUpdate - If economy is getting updated now then this would be 1
   * @param {Object} extraStorageParams
   * @param {Object} options
   * @param {Number} options.decimals
   * @param {String} options.displayName
   * @param {Number} options.conversionFactor
   * @param {String} options.symbol
   * @param {String} options.gatewayContractAddress
   * @param {String} options.originContractAddress
   * @constructor
   */
  constructor(params, extraStorageParams, options) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.contractAddress = params.contractAddress;
    oThis.provider = params.provider;
    oThis.ignoreErc20Validations = params.ignoreErc20Validations || 0;
    oThis.blockTimestamp = params.blockTimestamp;
    oThis.isUpdate = params.isUpdate || 0;

    if (options) {
      if (options.decimals) {
        oThis.decimals = options.decimals;
      }
      if (options.displayName) {
        oThis.displayName = options.displayName;
      }
      if (options.conversionFactor) {
        oThis.conversionFactor = options.conversionFactor;
      }
      if (options.symbol) {
        oThis.symbol = options.symbol;
      }
    }

    oThis.extraStorageParams = extraStorageParams;
  }

  /**
   * Main performer method
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/transactionParser/CreateEconomy');
      return responseHelper.error({
        internal_error_identifier: 's_tp_ce_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    let contractDetails = null,
      fetchContractKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'FetchERC20Contract'),
      fetchContractObj = new fetchContractKlass({
        contractAddress: oThis.contractAddress,
        provider: oThis.provider
      });

    let contractDetailsResp = await fetchContractObj.perform();

    if (contractDetailsResp && contractDetailsResp.isSuccess()) {
      contractDetails = contractDetailsResp.data.contractDetails;
    }

    // If all the properties are set then its an ERC 20 contract OR we are sure about its a contract
    if (contractDetails) {
      if (
        oThis.ignoreErc20Validations ||
        (contractDetails.name && contractDetails.symbol && contractDetails.totalSupply)
      ) {
        await oThis.updateIntoEconomy(contractDetails);
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * This function updates the entry in economy table.
   *
   * @returns {Promise<void>}
   */
  async updateIntoEconomy(contractDetails) {
    const oThis = this,
      EconomyModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyModel'),
      economyModelObject = new EconomyModel({
        consistentRead: 1
      });

    let totalSupply = contractDetails.totalSupply || '0',
      // Sanitizing the conversion factor here. Temp code
      conversionFactor = oThis.conversionFactor || sanitizer.sanitizeNumber(1),
      tokenDisplayName = oThis.displayName || contractDetails.name || oThis.contractAddress,
      tokenDisplaySymbol = oThis.symbol || contractDetails.symbol || oThis.contractAddress,
      balanceMaintainSupport = true,
      decimals = oThis.decimals || contractDetails.decimals || 18,
      marketCap = basicHelper
        .convertToNormalForPower(totalSupply, decimals)
        .div(basicHelper.convertToBigNumber(conversionFactor))
        .toFixed(5);

    // 38 is the limit for storing numbers in dynamo, we are assuming 36 as a safe limit.
    if (
      (basicHelper.isWeiValid(totalSupply) && totalSupply.toString().length > 36) ||
      (basicHelper.isWeiValid(marketCap) && marketCap.toString().length > 36)
    ) {
      balanceMaintainSupport = false;
      totalSupply = 0;
      marketCap = 0;
    }

    let insertParams = {
      chainId: oThis.chainId,
      contractAddress: oThis.contractAddress.toLowerCase(),
      marketCap: marketCap.toString(10),
      totalSupply: totalSupply,
      sortEconomyBy: '1',
      decimals: decimals,
      balanceMaintainSupport: balanceMaintainSupport,
      updatedTimestamp: Math.floor(Date.now() / 1000).toString()
    };

    Object.assign(insertParams, oThis.extraStorageParams);

    // If economy was updated, then somethings would not be updated in db.
    if (oThis.isUpdate === 0) {
      insertParams['conversionFactor'] = conversionFactor;
      insertParams['createdTimestamp'] = oThis.blockTimestamp;
      insertParams['totalTokenHolders'] = 0;
      insertParams['totalTokenTransfers'] = 0;
      insertParams['totalVolume'] = 0;
      insertParams['displayName'] = tokenDisplayName;
      insertParams['displaySymbol'] = tokenDisplaySymbol;
      insertParams['name'] = tokenDisplayName.toLowerCase();
      insertParams['symbol'] = tokenDisplaySymbol.toLowerCase();
    }

    let longNameToShortNamesMap = economyModelObject._getMergedLongToShortNamesMap(),
      filteredInsertParams = oThis._filterInsertParams(insertParams, longNameToShortNamesMap);

    logger.log('Updating economies table.');
    await economyModelObject.updateItem(filteredInsertParams);
  }

  /**
   * This function returns a map containing only those columns which are supposed to be inserted in economies table.
   *
   * @param {Object} insertParams
   * @param {Object} longNameToShortNamesMap
   * @return {Object}
   * @private
   */
  _filterInsertParams(insertParams, longNameToShortNamesMap) {
    const oThis = this;

    let filteredParams = {};

    for (let columnName in longNameToShortNamesMap) {
      filteredParams[columnName] = insertParams[columnName];
    }

    return filteredParams;
  }
}

InstanceComposer.registerAsShadowableClass(CreateEconomy, coreConstants.icNameSpace, 'CreateEconomy');
