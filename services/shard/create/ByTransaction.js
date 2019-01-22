'use strict';
/**
 * This service creates transaction and token transfer shard and corresponding entry in shards table.
 *
 * @module services/shard/create/ByTransaction
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CreateShardsBase = require(rootPrefix + '/services/shard/create/Base'),
  shardPrefixConstants = require(rootPrefix + '/lib/globalConstant/shardPrefix');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/sharded/byTransaction/Transaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/TransactionDetail');
require(rootPrefix + '/lib/models/sharded/byTransaction/TokenTransfer');

/**
 * Class for shard by transaction service
 *
 * @class
 */
class ShardByTransaction extends CreateShardsBase {
  /**
   * Constructor for create shards by transaction service
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   *
   * @constructor
   */
  constructor(chainId, shardNumber) {
    super(chainId, shardNumber);

    const oThis = this;

    oThis.identifier = shardPrefixConstants.transaction + '_' + oThis.chainId;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.createTokenTransferShard();

    await oThis.createTransactionShard();

    await oThis.createTransactionDetailShard();

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
   * This function creates a token transfer shard.
   *
   * @returns {Promise<void>}
   */
  async createTokenTransferShard() {
    const oThis = this,
      TokenTransferModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel'),
      tokenTransferModelObject = new TokenTransferModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await tokenTransferModelObject.createShard();

    logger.step('Token transfer shard created.');
  }

  /**
   * This function creates a transaction shard.
   *
   * @returns {Promise<void>}
   */
  async createTransactionShard() {
    const oThis = this,
      TransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'),
      transactionObject = new TransactionModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await transactionObject.createShard();

    logger.step('Transaction shard created.');
  }

  /**
   * This function creates a transaction detail shard.
   *
   * @returns {Promise<void>}
   */
  async createTransactionDetailShard() {
    const oThis = this,
      TransactionDetailModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailModel'),
      transactionObject = new TransactionDetailModel({
        shardIdentifier: oThis.shardIdentifier(),
        chainId: oThis.chainId
      });

    await transactionObject.createShard();

    logger.step('Transaction Detail shard created.');
  }
}

InstanceComposer.registerAsShadowableClass(ShardByTransaction, coreConstants.icNameSpace, 'ShardByTransactionService');

module.exports = ShardByTransaction;
