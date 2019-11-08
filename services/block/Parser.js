'use strict';
/**
 * Index for block parser
 *
 * @module services/block/Parser
 */

const rootPrefix = '../..',
  ServiceBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Define serviceType for getting signature.
const serviceType = serviceTypes.BlockParser;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/formatter/config');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/sharded/byBlock/Block');
require(rootPrefix + '/lib/models/sharded/byBlock/BlockDetail');
require(rootPrefix + '/lib/cacheManagement/shared/HighestBlockNo');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');
require(rootPrefix + '/lib/block/CheckIfProcessable');

/**
 * Class for block parser service
 *
 * @class
 */
class BlockParser extends ServiceBase {
  /**
   * Constructor for block parser service
   *
   * @param {Integer} chainId
   * @param {Object} options: optional params
   * @param {Integer} options.blockDelay: Intentional block delay for parsing the block
   * @param {Integer} options.blockToProcess: Block to process
   * @param {Boolean} options.forceUpdateBlock: Forcefully update block
   *
   * @constructor
   */
  constructor(chainId, options) {
    options = options || {};

    let params = {
      chainId: chainId,
      blockToProcess: options.blockToProcess,
      blockDelay: options.blockDelay,
      forceUpdateBlock: options.forceUpdateBlock
    };

    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockToProcess = params.blockToProcess;
    oThis.blockDelay = params.blockDelay || 0;
    oThis.forceUpdateBlock = params.forceUpdateBlock;
    oThis.currentBlockInfo = null;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      CheckIfBlockProcessable = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CheckIfBlockProcessable');

    logger.log('======1111 CheckIfBlockProcessable 111');

    // if blockToProcess is not given as a parameter, then get it from the shard_by_blocks table
    if (!oThis.blockToProcess && oThis.blockToProcess != 0) {
      logger.log('=====Fetching block to be processed.====');
      await oThis.getBlockToBeProcessed();
      logger.log('=====Block to be processed fetched====');
    }

    let checkIfBlockProcessable = new CheckIfBlockProcessable({
      chainId: oThis.chainId,
      blockToProcess: oThis.blockToProcess,
      blockDelay: oThis.blockDelay
    });

    logger.log('=====Checking if block is processable====');
    let checkIfBlockProcessableRsp = await checkIfBlockProcessable.perform();
    logger.log('=====Checked if block is processable====', checkIfBlockProcessableRsp);

    if (checkIfBlockProcessableRsp.isFailure() || !checkIfBlockProcessableRsp.data.blockProcessable) {
      return responseHelper.successWithData({
        rawCurrentBlock: {},
        nodesWithBlock: [],
        nextBlockToProcess: oThis.blockToProcess
      });
    }

    oThis.currentBlockInfo = checkIfBlockProcessableRsp.data.blockInfo;
    oThis.nodesWithBlock = checkIfBlockProcessableRsp.data.nodesWithBlock;

    logger.log('=====Calling function insert into shard by blocks====');

    let response = await oThis.insertIntoShardByBlocks(),
      blockToProcess;

    logger.log('====insert into shard by blocks function called====', response);

    if (response.isFailure()) {
      blockToProcess = oThis.blockToProcess;
    } else {
      // If update or create is required in block shards table
      // OR forceUpdateBlock is set true by Finalizer
      if (response.data.isUpdateRequired || oThis.forceUpdateBlock) {
        await oThis.updateBlockInfoInShard();
      }
      blockToProcess = oThis.blockToProcess + 1;
    }

    return responseHelper.successWithData({
      currentBlock: oThis.blockToProcess,
      rawCurrentBlock: oThis.currentBlockInfo,
      nodesWithBlock: oThis.nodesWithBlock,
      nextBlockToProcess: blockToProcess
    });
  }

  /**
   * Decides which block to be processed
   *
   * @returns {Promise<void>}
   */
  async getBlockToBeProcessed() {
    const oThis = this;

    let HighestProcessedBlockNoCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'HighestBlockNoCache'),
      highestProcessedBlockNoCache = new HighestProcessedBlockNoCache({
        chainId: oThis.chainId,
        consistentRead: oThis.consistentRead
      }),
      cacheFetchRsp = await highestProcessedBlockNoCache.fetch();

    let lastProcessedBlock = cacheFetchRsp.data['highestBlock'];

    oThis.blockToProcess = lastProcessedBlock + 1;
  }

  /**
   * Insert entry in shard by blocks table
   *
   * @returns {Promise<void>}
   */
  async insertIntoShardByBlocks() {
    const oThis = this;
    let record,
      isUpdateRequired = true;

    let ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel');

    oThis.shardByBlockModelObj = new ShardByBlockModel({
      consistentRead: true
    });

    logger.log('=====calling get shard identifier function=====');
    oThis.shardIdentifier = await oThis.getShardIdentifier();
    logger.log('=====get shard identifier function called=====', oThis.shardIdentifier);

    logger.debug('====shardIdentifier', oThis.shardIdentifier);

    let insertParams = {
      chainId: oThis.chainId,
      blockNumber: oThis.blockToProcess,
      blockHash: oThis.currentBlockInfo.hash.toLowerCase(),
      shardIdentifier: oThis.shardIdentifier
    };

    logger.log('=====Calling Put Item with params===', insertParams);
    // Insert in shard_by_blocks, don't update.
    let putItemResponse = await oThis.shardByBlockModelObj.putItem(insertParams);

    logger.log('=====Put Item called successfuly===');

    // if record already exists, then update only if block hash has changed.
    if (putItemResponse.internalErrorCode.endsWith('ConditionalCheckFailedException')) {
      logger.error('ConditionalCheckFailedException occurred...\nChecking if blockHash need to be updated');

      let getBlockParams = {
        chainId: oThis.chainId,
        blockNumber: oThis.blockToProcess
      };

      let getBlockResponse = await oThis.shardByBlockModelObj.getBlock(getBlockParams);

      let record = getBlockResponse.data;

      if (record) {
        oThis.shardIdentifier = record.shardIdentifier;
      } else {
        // Return error
        return responseHelper.error({
          internal_error_identifier: 's_b_p_1',
          api_error_identifier: 'something_went_wrong'
        });
      }

      // Block is found in db and its block hash matches with chain data of block then don't update else by default update.
      if (record && record.blockHash == oThis.currentBlockInfo.hash.toLowerCase()) {
        isUpdateRequired = false;
      }
    }

    return responseHelper.successWithData({ isUpdateRequired: isUpdateRequired });
  }

  /**
   * Updates data in blocks shard
   *
   * @returns {Promise}
   */
  async updateBlockInfoInShard() {
    const oThis = this;

    let BlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel'),
      blockModel = new BlockModel({
        chainId: oThis.chainId,
        shardIdentifier: oThis.shardIdentifier
      });

    let updateParams = {
      chainId: oThis.chainId,
      blockNumber: oThis.blockToProcess,
      blockHash: oThis.currentBlockInfo.hash,
      gasUsed: oThis.currentBlockInfo.gasUsed,
      totalTransactions: oThis.currentBlockInfo.transactions.length,
      blockTimestamp: oThis.currentBlockInfo.timestamp,
      size: oThis.currentBlockInfo.size,
      updatedTimestamp: Math.floor(Date.now() / 1000)
    };

    logger.debug('====updateParams', updateParams);

    await blockModel.updateItem(updateParams);

    await oThis.updateBlockDetailsInShard();
  }

  /**
   * Updates data in blocks details shard
   *
   * @returns {Promise}
   */
  async updateBlockDetailsInShard() {
    const oThis = this;

    let BlockDetailModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockDetailModel'),
      blockDetailModel = new BlockDetailModel({
        chainId: oThis.chainId,
        shardIdentifier: oThis.shardIdentifier
      });

    let updateParams = {
      chainId: oThis.chainId,
      blockNumber: oThis.blockToProcess,
      parentBlockHash: oThis.currentBlockInfo.parentHash,
      difficulty: oThis.currentBlockInfo.difficulty,
      extraData: oThis.currentBlockInfo.extraData,
      miner: oThis.currentBlockInfo.miner,
      nonce: oThis.currentBlockInfo.nonce,
      stateRoot: oThis.currentBlockInfo.stateRoot,
      receiptsRoot: oThis.currentBlockInfo.receiptsRoot,
      transactionsRoot: oThis.currentBlockInfo.transactionsRoot,
      sha3Uncles: oThis.currentBlockInfo.sha3Uncles,
      updatedTimestamp: Math.floor(Date.now() / 1000)
    };

    logger.debug('====updateParams', updateParams);

    await blockDetailModel.updateItem(updateParams);
  }

  /**
   * Shard identification logic
   *
   * @returns {String}
   */
  async getShardIdentifier() {
    const oThis = this,
      AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache');

    let availableShardsCache = new AvailableShardsCache({ consistentRead: oThis.consistentRead });

    logger.log('====availableShardsCache fetch called===');

    let response = await availableShardsCache.fetch();

    logger.log('====availableShardsCache fetch called and returned:===', response);

    let shardNumbers = response.data.bk;

    // shardIndex to be obtained in a round robin manner.
    let shardIndex = oThis.blockToProcess % shardNumbers.length;

    return oThis.chainId + '_' + shardNumbers[shardIndex];
  }
}

InstanceComposer.registerAsShadowableClass(BlockParser, coreConstants.icNameSpace, 'BlockParser');
