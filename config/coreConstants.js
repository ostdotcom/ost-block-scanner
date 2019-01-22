'use strict';
/**
 * Load all the core constants.
 *
 * @module config/coreConstants
 */
const rootPrefix = '..',
  paramErrorConfig = require(rootPrefix + '/config/error/param'),
  apiErrorConfig = require(rootPrefix + '/config/error/general');

/**
 * Class for core constants
 *
 * @class
 *
 */
class CoreConstants {
  /**
   * Constructor for core constants
   *
   * @constructor
   */
  constructor() {}

  /**
   * Debug enabled
   *
   * @returns {*}
   */
  get DEBUG_ENABLED() {
    return process.env.OST_DEBUG_ENABLED;
  }

  /**
   * Web3 pool size
   *
   * @returns {*}
   */
  get OST_WEB3_POOL_SIZE() {
    return process.env.OST_WEB3_POOL_SIZE;
  }

  /**
   * Error config
   *
   * @returns {*}
   */
  get ERROR_CONFIG() {
    return {
      param_error_config: paramErrorConfig,
      api_error_config: apiErrorConfig
    };
  }

  /**
   * Returns package name
   *
   * @return {String}
   */
  get icNameSpace() {
    return 'openst-block-scanner';
  }

  /**
   * Batch delete retry count
   *
   * @return {Number}
   */
  get batchDeleteRetryCount() {
    return 10;
  }
}

module.exports = new CoreConstants();
