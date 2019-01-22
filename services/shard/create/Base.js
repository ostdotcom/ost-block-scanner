'use strict';
/**
 * This is Base Class for create shards services.
 *
 * @module services/shard/create/Base
 */
const rootPrefix = '../../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

// Define serviceType for getting signature.
const serviceType = signatureConstants.CreateShards;

/**
 * Base class for create shards
 *
 * @class
 */
class CreateShardsBaseKlass extends ServicesBase {
  /**
   * Constructor for create shards base class service
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   * @constructor
   */
  constructor(chainId, shardNumber) {
    const params = { chainId: chainId, shardNumber: shardNumber };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.shardNumber = params.shardNumber;
  }

  /**
   * This method returns the shardIdentifier.
   *
   * @returns {String}
   */
  shardIdentifier() {
    const oThis = this;

    return oThis.chainId + '_' + oThis.shardNumber;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    throw 'sub-class to implement';
  }

  /**
   * This function creates an entry in the shards table.
   *
   * @returns {Promise<void>}
   */
  async createEntryInShards() {
    throw 'sub class to implement';
  }
}

module.exports = CreateShardsBaseKlass;
