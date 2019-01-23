'use strict';
/**
 * This service creates economy address transaction and economy address transfer shard and corresponding entry in shards table.
 *
 * @module services/shard/create/ByEconomyAddress
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CreateShardsBase = require(rootPrefix + '/services/shard/create/Base'),
  cidPrefix = require(rootPrefix + '/lib/globalConstant/cidPrefix');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransfer');
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransaction');

/**
 * Class for shard by economy address service
 *
 * @class
 */
class ShardByEconomyAddress extends CreateShardsBase {
  /**
   * Constructor for create shards by economy address service
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   *
   * @constructor
   */
  constructor(chainId, shardNumber) {
    super(chainId, shardNumber);

    const oThis = this;

    oThis.identifier = cidPrefix.economyAddress + '_' + oThis.chainId;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.createEconomyAddressTransferShard();

    await oThis.createEconomyAddressTransactionShard();

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
   * This function creates an economy address transfer shard.
   *
   * @returns {Promise<void>}
   */
  async createEconomyAddressTransferShard() {
    const oThis = this,
      EconomyAddressTransferModel = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransferModel'),
      economyAddressTransferObject = new EconomyAddressTransferModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await economyAddressTransferObject.createShard();

    logger.step('Economy address transfer shard created.');
  }

  /**
   * This function creates an economy address transaction shard.
   *
   * @returns {Promise<void>}
   */
  async createEconomyAddressTransactionShard() {
    const oThis = this,
      EconomyAddressTransactionModel = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransactionModel'),
      economyAddressTransactionObject = new EconomyAddressTransactionModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await economyAddressTransactionObject.createShard();

    logger.step('Economy address transaction shard created.');
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardByEconomyAddress,
  coreConstants.icNameSpace,
  'ShardByEconomyAddressService'
);

module.exports = ShardByEconomyAddress;
