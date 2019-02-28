'use strict';
/**
 * This service creates chain shard and corresponding entries in the sharded tables.
 *
 * @module services/shard/create/ByChainId
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CreateShardsBase = require(rootPrefix + '/services/shard/create/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/sharded/byChainId/PendingTransaction');

/**
 * Class for shard by chainId service
 *
 * @class
 */
class ShardByChainId extends CreateShardsBase {
  /**
   * Constructor for create shards by chain-id
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   *
   * @constructor
   */
  constructor(chainId, shardNumber) {
    super(chainId, shardNumber);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.shardNumber = shardNumber;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.createChainIdShard();
  }

  /**
   * This function creates a chainId shard.
   *
   * @returns {Promise<void>}
   */
  async createChainIdShard() {
    const oThis = this,
      PendingTransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionModel'),
      pendingTransactionModelObject = new PendingTransactionModel({
        chainId: oThis.chainId
      });

    await pendingTransactionModelObject.createShard();

    logger.step('ChainId shard created.');
  }
}

InstanceComposer.registerAsShadowableClass(ShardByChainId, coreConstants.icNameSpace, 'ShardByChainIdService');

module.exports = ShardByChainId;
