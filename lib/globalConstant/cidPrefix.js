'use strict';
/**
 * Content identifier prefix constants
 *
 * @module lib/globalConstant/cidPrefix
 */

/**
 * Class for content identifier prefix constants
 *
 * @class
 */
class CidPrefix {
  /**
   * Constructor for content identifier prefix constants
   *
   * @constructor
   */
  constructor() {}

  get block() {
    return 'bk';
  }

  get transaction() {
    return 'tx';
  }

  get economyAddress() {
    return 'ea';
  }

  get economyContractAddress() {
    return 'ec';
  }
}

module.exports = new CidPrefix();
