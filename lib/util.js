'use strict';
/**
 * Utility functions.
 *
 * @module lib/util
 */

/**
 * Class for utility functions
 *
 * @class
 */
class Util {
  /**
   * Constructor for uitility functions
   *
   * @constructor
   */
  constructor() {}

  /**
   * Formats the date object
   *
   * @param {Date} dateObj
   *
   * @returns {String}
   */
  formatDbDate(dateObj) {
    function pad(n) {
      return n < 10 ? '0' + n : n;
    }

    return (
      dateObj.getFullYear() +
      '-' +
      pad(dateObj.getMonth() + 1) +
      '-' +
      pad(dateObj.getDate()) +
      ' ' +
      pad(dateObj.getHours()) +
      ':' +
      pad(dateObj.getMinutes()) +
      ':' +
      pad(dateObj.getSeconds())
    );
  }

  /**
   * Inverts a json
   *
   * @param {Object} json
   *
   * @returns {Object}
   */
  invert(json) {
    let ret = {};
    for (let key in json) {
      ret[json[key]] = key;
    }
    return ret;
  }

  /**
   * Clones the input object
   *
   * @param {Object} obj
   *
   * @returns {any}
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Converts ascii string to its hex equivalent
   *
   * @param {String} str
   *
   * @returns {String}
   */
  asciiToHex(str) {
    let arr1 = [];
    for (let n = 0, l = str.length; n < l; n++) {
      let hex = Number(str.charCodeAt(n)).toString(16);
      arr1.push(hex);
    }
    return '0x' + arr1.join('');
  }

  /**
   * Generate random passphrase
   *
   * @param {Integer} length
   *
   * @returns {String}
   */
  generatePassphrase(length) {
    length = length || 30;

    let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@%*#^*',
      retVal = '';

    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }

    return retVal;
  }

  /**
   * Adds leading zeroes
   *
   * @param {String} str
   * @param {Integer} number: Number of zeroes to add.
   *
   * @returns {String}
   * eg: str = '12' number = 4 returns:'0012'
   */
  addLeadingZeroes(str, number) {
    return str.padStart(number, '0');
  }

  /**
   * This function is used to generate pagination timestamp.
   *
   * @param {Integer} baseNumber
   * @param {Integer} power1
   * @param {Integer} power2
   *
   * @returns {String}
   */
  generatePaginationTimestamp(baseNumber, power1, power2) {
    const oThis = this;
    oThis.addLeadingZeroes(baseNumber.toString(), 8);
    power1 = power1 || 0;
    power2 = power2 || 0;

    let stringPower1 = oThis.addLeadingZeroes(power1.toString(), 5),
      stringPower2 = '';
    if (power2) {
      stringPower2 = oThis.addLeadingZeroes(power2.toString(), 3);
    }
    return baseNumber + '.' + stringPower1 + stringPower2;
  }

  /**
   * This function is used to split pagination timestamp.
   *
   * @param {String} paginationTimestamp
   *
   * @returns {Object}
   */
  splitPaginationTimestamp(paginationTimestamp) {
    let pts = paginationTimestamp.toString().split('.'),
      baseNumber = pts[0],
      power1 = pts[1].slice(0, 5),
      power2 = pts[1].slice(5, 8);

    return {
      baseNumber: parseInt(baseNumber),
      power1: parseInt(power1),
      power2: parseInt(power2)
    };
  }

  /**
   * This function is used to find out whether address is empty or default 0x0.
   *
   * @param {String} address
   *
   * @returns {Boolean}
   */
  isEmptyAddress(address) {
    return !address || address == '' || address == '0x0' || address == '0x0000000000000000000000000000000000000000';
  }

  /**
   * sleep for particular time
   *
   * @param ms {number} - time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = new Util();
