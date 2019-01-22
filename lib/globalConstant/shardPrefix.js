'use strict';
/**
 * Shard prefix constants
 *
 * @module lib/globalConstant/shardPrefix
 */

/**
 * Class for shard prefix constants
 *
 * @class
 */
class ShardPrefix {
  /**
   * Constructor for shard prefix constants
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

module.exports = new ShardPrefix();
