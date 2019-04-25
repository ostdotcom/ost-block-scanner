'use strict';
/**
 * This is base class for all services.
 *
 * @module services/Base
 */
const rootPrefix = '../',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  commonValidators = require(rootPrefix + '/lib/validators/common'),
  serviceSignature = require(rootPrefix + '/config/serviceSignature').getSignature();

const errorConfig = basicHelper.getErrorConfig();

/**
 * Base class for all services
 *
 * @class
 */
class ServicesBase {
  /**
   * Constructor for base class service
   *
   * @param {Object} params
   * @param {String} serviceType
   *
   * @constructor
   */
  constructor(params, serviceType) {
    const oThis = this;

    oThis.params = params;
    oThis.serviceType = serviceType;

    // If consistentRead is not passed, default value is 0.
    if (params.options) {
      oThis.consistentRead = params.options.consistentRead || 0;
    }

    oThis.paramsConfig = null;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    // Run validations.
    return oThis
      .validateAndSanitize()
      .then(function() {
        // If validations pass successfully, execute asyncPerform() by running the below then block.
        return oThis.asyncPerform().catch(function(err) {
          // If asyncPerform fails, run the below catch block.
          logger.error(' In catch block of services/Base.js');
          return responseHelper.error({
            internal_error_identifier: 's_b_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: err,
            error_config: errorConfig
          });
        });
      })
      .catch(function(err) {
        // If validations fail, run the below catch block
        logger.error(' In catch block of services/Base.js');
        return responseHelper.error({
          internal_error_identifier: 's_b_2',
          api_error_identifier: 'validations_failed',
          debug_options: err,
          error_config: errorConfig
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

    oThis.paramsConfig = serviceSignature[oThis.serviceType];

    if (!oThis.paramsConfig) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_b_3',
          api_error_identifier: 'invalidServiceType',
          debug_options: {}
        })
      );
    }

    await oThis._validateMandatoryParams();

    await oThis._checkOptionalParams();
  }

  /**
   * This function validates mandatory parameters.
   *
   * @returns {*}
   * @private
   */
  async _validateMandatoryParams() {
    const oThis = this,
      mandatoryKeys = oThis.paramsConfig.mandatory || [],
      paramErrors = [];

    let hasError = false;

    for (let index = 0; index < mandatoryKeys.length; index++) {
      let whiteListedKeyConfig = mandatoryKeys[index],
        whiteListedKeyName = whiteListedKeyConfig.parameter;

      if (
        oThis.params.hasOwnProperty(whiteListedKeyName) &&
        !commonValidators.isVarNull(oThis.params[whiteListedKeyName])
      ) {
        // Validate value as per method name passed in config
        let valueToValidate = oThis.params[whiteListedKeyName],
          validatorMethodName = whiteListedKeyConfig.validatorMethod,
          validatorMethodInstance = commonValidators[validatorMethodName],
          isValueValid = null;
        if (!validatorMethodInstance) {
          isValueValid = false;
          logger.error(`${validatorMethodName} does not exist.`);
        }
        isValueValid = validatorMethodInstance.apply(commonValidators, [valueToValidate]);
        if (!isValueValid) {
          paramErrors.push(`invalid${oThis.firstLetterUppercase(whiteListedKeyName)}`);
          hasError = true;
        }
      } else {
        paramErrors.push(`missing${oThis.firstLetterUppercase(whiteListedKeyName)}`);
        hasError = true;
      }
    }

    if (hasError) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_b_4',
          api_error_identifier: 'invalidParams',
          params_error_identifiers: paramErrors,
          error_config: errorConfig,
          debug_options: {}
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
  }

  /**
   * Check optional params
   *
   * @private
   *
   * @return {result}
   */
  async _checkOptionalParams() {
    const oThis = this,
      optionalKeysConfig = oThis.paramsConfig.optional || [],
      paramErrors = [];

    let hasError = false;

    for (let i = 0; i < optionalKeysConfig.length; i++) {
      let optionalKeyConfig = optionalKeysConfig[i],
        optionalKeyName = optionalKeyConfig.parameter;

      if (oThis.params.hasOwnProperty(optionalKeyName) && !commonValidators.isVarNull(oThis.params[optionalKeyName])) {
        //validate value as per method name passed in config
        let valueToValidate = oThis.params[optionalKeyName],
          validatorMethodName = optionalKeyConfig.validatorMethod,
          validatorMethodInstance = commonValidators[validatorMethodName],
          isValueValid = null;
        if (!validatorMethodInstance) {
          isValueValid = false;
          logger.error(`${validatorMethodName} does not exist.`);
        }
        isValueValid = validatorMethodInstance.apply(commonValidators, [valueToValidate]);

        if (!isValueValid) {
          paramErrors.push(`invalid${oThis.firstLetterUppercase(optionalKeyName)}`);
          hasError = true;
        }
      }
    }

    if (hasError) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_b_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: paramErrors,
          error_config: errorConfig,
          debug_options: {}
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
  }

  /**
   * Turn first letter of string to uppercase.
   *
   * @param {String} string
   *
   * @return {String}
   */
  firstLetterUppercase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    throw 'sub-class to implement';
  }
}

module.exports = ServicesBase;
