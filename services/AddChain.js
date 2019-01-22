'use strict';
/**
 * This service creates chain shard and corresponding entries in the sharded tables.
 *
 * @module services/AddChain
 */
const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Chain');
require(rootPrefix + '/services/shard/create/ByBlock');
require(rootPrefix + '/services/shard/create/ByChainId');
require(rootPrefix + '/services/shard/create/ByTransaction');
require(rootPrefix + '/services/shard/create/ByEconomyAddress');
require(rootPrefix + '/lib/models/shared/ChainCronData');

/**
 * Class for add chain service
 *
 * @class
 */
class AddChain {
  /**
   * Constructor for add chain service
   *
   * @param {Object} params
   * @param {Number} params.chainId
   * @param {Number} params.networkId
   * @param {Object} params.blockShardCount
   * @param {Object} params.economyShardCount
   * @param {Object} params.economyAddressShardCount
   * @param {Object} params.transactionShardCount
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.networkId = params.networkId;
    oThis.chainIdShardCount = 1; // ChainId shard count is hard coded just to bypass the services common validation.
    oThis.blockShardCount = params.blockShardCount || 1;
    oThis.economyShardCount = params.economyShardCount || 1;
    oThis.economyAddressShardCount = params.economyAddressShardCount || 1;
    oThis.transactionShardCount = params.transactionShardCount || 1;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/AddChain.js');
      return responseHelper.error({
        internal_error_identifier: 's_ac_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    // Validate the input parameters.
    await oThis.validateAndSanitize();
    // Create chain entry in chains table.
    await oThis.createEntryInChains();
    // Create chain entry in chain crons table.
    await oThis.createEntryInChainCronsData();
    // Create block shards.
    await oThis.createBlockShards();
    // Create chainId shards
    await oThis.createChainIdShards();
    // Create economy address shards.
    await oThis.createEconomyAddressShards();
    // Create transaction shards.
    await oThis.createTransactionShards();
  }

  /**
   * This method performs certain validations on the input params.
   *
   * @returns {Promise<>}
   */
  validateAndSanitize() {
    const oThis = this;

    if (!oThis.chainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_ac_2',
          api_error_identifier: 'missingChainId',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    if (!oThis.networkId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_ac_3',
          api_error_identifier: 'missingNetworkId',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * This function creates an entry in the chains table.
   *
   * @returns {Promise<void>}
   */
  async createEntryInChains() {
    const oThis = this,
      ChainModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ChainModel'),
      chainModelObject = new ChainModel({}); // Params are mandatory.

    let insertParams = {
      TableName: chainModelObject.tableName(),
      Item: {
        [chainModelObject.shortNameFor('chainId')]: {
          N: oThis.chainId.toString()
        },
        [chainModelObject.shortNameFor('networkId')]: {
          N: oThis.networkId.toString()
        }
      },
      ConditionExpression: 'cid <> :chainIdVal',
      ExpressionAttributeValues: {
        ':chainIdVal': { N: oThis.chainId.toString() }
      }
    };

    await chainModelObject.ddbServiceObj.putItem(insertParams);
    logger.step('Entry created in chains table.');
  }

  /**
   * This function creates an entry in the chains table.
   *
   * @returns {Promise<void>}
   */
  async createEntryInChainCronsData() {
    const oThis = this,
      ChainCronModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ChainCronDataModel'),
      chainCronModelObject = new ChainCronModel({ consistentRead: 1 }); // Params are mandatory.

    let insertParams = {
      TableName: chainCronModelObject.tableName(),
      Item: {
        [chainCronModelObject.shortNameFor('chainId')]: {
          N: oThis.chainId.toString()
        },
        [chainCronModelObject.shortNameFor('lastFinalizedBlock')]: {
          N: '0'
        },
        [chainCronModelObject.shortNameFor('lastAggregatedBlock')]: {
          N: '0'
        }
      },
      ConditionExpression: 'cid <> :chainIdVal',
      ExpressionAttributeValues: {
        ':chainIdVal': { N: oThis.chainId.toString() }
      }
    };

    await chainCronModelObject.ddbServiceObj.putItem(insertParams);
    logger.step('Entry created in chain crons table.');
  }

  /**
   * This function creates block shards for the chainId.
   *
   * @returns {Promise<void>}
   */
  async createBlockShards() {
    const oThis = this,
      ShardByBlockService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockService');

    let loopingVar = 0,
      shardByBlockPromiseArray = [];
    while (loopingVar < oThis.blockShardCount) {
      const shardByBlockServiceObject = new ShardByBlockService(oThis.chainId, loopingVar + 1);
      shardByBlockPromiseArray.push(shardByBlockServiceObject.perform());
      loopingVar++;
    }
    await Promise.all(shardByBlockPromiseArray);
    logger.step('Block shards created.');
  }

  /**
   * This function creates chainId shards for the chainId.
   *
   * @returns {Promise<void>}
   */
  async createChainIdShards() {
    const oThis = this,
      ShardByChainIdService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByChainIdService');

    let shardByChainIdPromiseArray = [];
    const shardByChainIdServiceObject = new ShardByChainIdService(oThis.chainId, oThis.chainIdShardCount);
    shardByChainIdPromiseArray.push(shardByChainIdServiceObject.perform());

    await Promise.all(shardByChainIdPromiseArray);
    logger.step('ChainId shard created.');
  }

  /**
   * This function creates economy address shards for the chainId.
   *
   * @returns {Promise<void>}
   */
  async createEconomyAddressShards() {
    const oThis = this,
      ShardByEconomyAddressService = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressService');

    let loopingVar = 0,
      shardByEconomyAddressPromiseArray = [];
    while (loopingVar < oThis.economyAddressShardCount) {
      const shardByEconomyServiceObject = new ShardByEconomyAddressService(oThis.chainId, loopingVar + 1);
      shardByEconomyAddressPromiseArray.push(shardByEconomyServiceObject.perform());
      loopingVar++;
    }
    await Promise.all(shardByEconomyAddressPromiseArray);
    logger.step('Economy address shards created.');
  }

  /**
   * This function creates transaction shards for the chainId.
   *
   * @returns {Promise<void>}
   */
  async createTransactionShards() {
    const oThis = this,
      ShardByTransactionService = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionService');

    let loopingVar = 0,
      shardByTransactionPromiseArray = [];
    while (loopingVar < oThis.transactionShardCount) {
      const shardByTransactionObject = new ShardByTransactionService(oThis.chainId, loopingVar + 1);
      shardByTransactionPromiseArray.push(shardByTransactionObject.perform());
      loopingVar++;
    }
    await Promise.all(shardByTransactionPromiseArray);
    logger.step('Transaction shards created.');
  }
}

InstanceComposer.registerAsShadowableClass(AddChain, coreConstants.icNameSpace, 'AddChainService');

module.exports = AddChain;
