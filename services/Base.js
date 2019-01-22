'use strict';
/**
 * This is base class for all services.
 *
 * @module services/Base
 */
const rootPrefix = '../',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  signatureConfig = require(rootPrefix + '/config/signature'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const errorConfig = basicHelper.getErrorConfig(),
  internalConfig = signatureConfig.getSignature();

/**
 * Base class for all services
 *
 * @class
 */
class ServicesBaseKlass {
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

    oThis.paramsConfig = internalConfig[oThis.serviceType];

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

    for (let i = 0; i < mandatoryKeys.length; i++) {
      let whiteListedKeyData = mandatoryKeys[i],
        whiteListedKey = whiteListedKeyData.parameter;

      if (
        !oThis.params.hasOwnProperty(whiteListedKey) ||
        oThis.params[whiteListedKey] === undefined ||
        oThis.params[whiteListedKey] === null
      ) {
        paramErrors.push(whiteListedKeyData.error_identifier);
        hasError = true;
      }
    }

    if (hasError) {
      console.trace('=====');
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_b_4',
          api_error_identifier: 'invalidParams',
          params_error_identifiers: paramErrors,
          error_config: basicHelper.getErrorConfig(),
          debug_options: {}
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
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

module.exports = ServicesBaseKlass;
