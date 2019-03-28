'use strict';
/**
 * Types of shards.
 *
 * @module lib/globalConstant/shardType
 */

/**
 * Class for shard types
 *
 * @class
 */
class ShardType {
  /**
   * Constructor for shard types
   *
   * @constructor
   */
  constructor() {}

  get blockShard() {
    return 'block';
  }

  get transactionShard() {
    return 'transaction';
  }

  get economyAddressShard() {
    return 'economyAddress';
  }

  get economyContractAddressShard() {
    return 'economyContractAddress';
  }
}

module.exports = new ShardType();
