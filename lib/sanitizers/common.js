'use strict';
/**
 * Common sanitizers
 *
 * @module lib/sanitizers/common
 */

const sanitizeHtml = require('sanitize-html'),
  BigNumber = require('bignumber.js');

class CommonSanitizer {
  constructor() {}

  /**
   * Is valid Name
   *
   *
   * @param {String} str
   * @param {Array} allowedTags: allowed tags array
   *
   * @returns {Boolean}
   */
  sanitizeString(str, allowedTags) {
    return sanitizeHtml(str, { allowedTags: allowedTags || [] });
  }

  /**
   * Returns sanitized number.
   *
   * @param {Number} number
   *
   * @returns {String}
   */
  sanitizeNumber(number) {
    try {
      let convertedBigNumber = new BigNumber(number);
      return convertedBigNumber.toString(10);
    } catch (err) {
      return '0';
    }
  }
}

module.exports = new CommonSanitizer();
