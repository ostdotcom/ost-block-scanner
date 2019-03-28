'use strict';
/**
 * This service creates chain shard and corresponding entries in the sharded tables.
 *
 * @module services/shard/create/ByBlock
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cidPrefix = require(rootPrefix + '/lib/globalConstant/cidPrefix'),
  CreateShardsBase = require(rootPrefix + '/services/shard/create/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/sharded/byBlock/Block');
require(rootPrefix + '/lib/models/sharded/byBlock/BlockDetail');

/**
 * Class for shard by block service
 *
 * @class
 */
class ShardByBlock extends CreateShardsBase {
  /**
   * Constructor for create shards by block service
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   *
   * @constructor
   */
  constructor(chainId, shardNumber) {
    super(chainId, shardNumber);

    const oThis = this;

    oThis.identifier = cidPrefix.block + '_' + oThis.chainId;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.createBlockShard();

    await oThis.createBlockDetailsShard();

    await oThis.createEntryInShards();
  }

  /**
   * This function creates an entry in the shards table.
   *
   * @returns {Promise<void>}
   */
  async createEntryInShards() {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObject = new ShardModel({
        consistentRead: oThis.consistentRead
      });

    let insertParams = {
      identifier: oThis.identifier,
      shardNumber: oThis.shardNumber.toString(),
      isAvailableForAllocation: true
    };

    await shardModelObject.putItem(insertParams);

    logger.step('Entry created in shards table.');
  }

  /**
   * This function creates a block shard.
   *
   * @returns {Promise<void>}
   */
  async createBlockShard() {
    const oThis = this,
      BlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel'),
      blockModelObject = new BlockModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await blockModelObject.createShard();

    logger.step('Block shard created.');
  }

  /**
   * This function creates a block details shard.
   *
   * @returns {Promise<void>}
   */
  async createBlockDetailsShard() {
    const oThis = this,
      BlockDetailModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockDetailModel'),
      blockDetailModelObj = new BlockDetailModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await blockDetailModelObj.createShard();

    logger.step('Block Details shard created.');
  }
}

InstanceComposer.registerAsShadowableClass(ShardByBlock, coreConstants.icNameSpace, 'ShardByBlockService');

module.exports = ShardByBlock;
