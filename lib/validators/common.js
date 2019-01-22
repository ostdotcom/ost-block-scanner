'use strict';
/**
 * Common validators
 *
 * @module lib/validators/common
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic');

/**
 * Class for common validator.
 *
 * @class
 */
class CommonValidator {
  constructor() {}

  /**
   * Is valid Boolean?
   *
   * @param {String} str
   * @returns {Boolean}
   */
  isValidBoolean(str) {
    const oThis = this;

    if (oThis.isVarNull(str)) {
      return false;
    }
    return str === 'true' || str === 'false' || str === true || str === false;
  }

  /**
   * Is var null ?
   *
   * @param {Integer} variable
   * @returns {Boolean}
   */
  isVarNull(variable) {
    return typeof variable === 'undefined' || variable == null;
  }

  /**
   * Is var true?
   *
   * @returns {Boolean}
   */
  isVarTrue(variable) {
    return variable === true || variable === 'true';
  }

  /**
   * Is var false?
   *
   * @param {Boolean} variable
   * @returns {Boolean}
   */
  isVarFalse(variable) {
    return variable === false || variable === 'false';
  }

  /**
   * Is var integer?
   *
   * @param {Integer} variable
   * @returns {Boolean}
   */
  isVarInteger(variable) {
    return typeof variable === 'number' && variable % 1 === 0;
  }

  /**
   * Is valid Boolean?
   *
   * @param {String} str
   * @returns {Boolean}
   */
  isValidOrderingString(str) {
    return ['asc', 'desc'].includes(str.toLowerCase());
  }

  /**
   * Is valid UUID Array?
   *
   * @param {Array} array
   * @returns {Boolean}
   */
  isValidUuidArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!basicHelper.isUuidValid(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if the given string is an address
   *
   * @param {String} address: ETH address in HEX
   * @returns {Boolean}
   */
  validateEthAddress(address) {
    const oThis = this;

    if (oThis.isVarNull(address) || typeof address !== 'string' || address == '') {
      return false;
    }
    address = address.trim().toLowerCase();

    return /^(0x)?[0-9a-f]{40}$/i.test(address);
  }
}

module.exports = new CommonValidator();
