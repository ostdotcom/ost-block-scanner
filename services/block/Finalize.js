'use strict';
/*
 * Finalize the transactions for a particular block
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/block/CheckIfProcessable');
require(rootPrefix + '/lib/models/shared/ChainCronData');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/sharded/byBlock/Block');
require(rootPrefix + '/services/block/Parser');
require(rootPrefix + '/lib/block/DistributeTransactions');
require(rootPrefix + '/lib/block/FetchTransactions');
require(rootPrefix + '/lib/block/RevertBlockTransactionsData');

class Finalize {
  /**
   * constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.blockDelay = params.blockDelay;
    oThis.revertedBlock = false;
  }

  /**
   * perform
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/block/Finalize');
      return responseHelper.error({
        internal_error_identifier: 's_b_f_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * asyncPerform
   *
   */
  async asyncPerform() {
    const oThis = this;

    oThis.revertedBlock = false;

    let blockToProcess = await oThis.getBlockToFinalize();

    let resp = await oThis.validateBlockToProcess(blockToProcess);

    if (resp.data.blockProcessable) {
      resp = await oThis.finalizeBlock();
    }

    if (resp.isSuccess()) {
      return responseHelper.successWithData(resp.data);
    } else {
      return responseHelper.error({
        internal_error_identifier: 's_b_f_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: resp.err,
        error_config: errorConfig
      });
    }
  }

  /**
   * getBlockToFinalize
   *
   * @return {Promise}
   */
  async getBlockToFinalize() {
    const oThis = this,
      ChainCronDataModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ChainCronDataModel'),
      chainCronDataObj = new ChainCronDataModel({ consistentRead: 1 });

    let cronDataRsp = await chainCronDataObj.getCronData(oThis.chainId);

    return parseInt(cronDataRsp[oThis.chainId]['lastFinalizedBlock']) + 1;
  }

  /**
   * Validate whether block is processable or not.
   *
   * @return {Promise}
   */
  async validateBlockToProcess(blockToProcess) {
    const oThis = this;

    const CheckIfBlockProcessable = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'CheckIfBlockProcessable');
    let checkIfBlockProcessable = new CheckIfBlockProcessable({
      chainId: oThis.chainId,
      blockToProcess: blockToProcess,
      blockDelay: oThis.blockDelay
    });

    let checkIfBlockProcessableRsp = await checkIfBlockProcessable.perform();

    if (!checkIfBlockProcessableRsp.data.blockProcessable) {
      return responseHelper.successWithData({ blockProcessable: false });
    }

    // This represents block information from Chain.
    oThis.currentBlockInfo = checkIfBlockProcessableRsp.data.blockInfo;
    oThis.blockToProcess = blockToProcess;

    return responseHelper.successWithData({ blockProcessable: true });
  }

  /**
   * Finalize block by checking Chain v/s Dynamo data
   *
   * @return {Promise}
   */
  async finalizeBlock() {
    const oThis = this;

    let response = await oThis.checkBlockData();

    if (response.isFailure()) return response;

    // Don't check transaction data if reverted already
    if (!oThis.revertedBlock) {
      response = await oThis.checkTransactionData();

      if (response.isFailure()) return response;
    }

    if (oThis.revertedBlock) {
      response = await oThis.reProcessBlock();

      if (response.isFailure()) return response;
    }

    return responseHelper.successWithData({
      processedBlock: oThis.blockToProcess,
      blockProcessable: true,
      processedTransactions: oThis.currentBlockInfo.transactions
    });
  }

  /**
   * checkBlockData
   *
   * @return {Promise<void>}
   */
  async checkBlockData() {
    const oThis = this,
      ShardByBlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      BlockModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel'),
      shardByBlockObj = new ShardByBlockModel({});

    let shardByBlockRsp = await shardByBlockObj.getBlock({
      chainId: oThis.chainId,
      blockNumber: oThis.blockToProcess
    });

    let shardByBlocksRow = shardByBlockRsp.data,
      blockRevertNeeded = false;

    // Shard by block found now get block details
    if (shardByBlocksRow['blockNumber']) {
      let blockModel = new BlockModel({
          chainId: oThis.chainId,
          shardIdentifier: shardByBlocksRow.shardIdentifier
        }),
        getBlockDetailsRsp = await blockModel.getBlockDetails([oThis.blockToProcess]);
      // Block revert is needed if block data is not found in Db or block hash is not matching.
      blockRevertNeeded =
        !getBlockDetailsRsp.data[oThis.blockToProcess] ||
        !getBlockDetailsRsp.data[oThis.blockToProcess].blockHash ||
        getBlockDetailsRsp.data[oThis.blockToProcess].blockHash.toLowerCase() !=
          oThis.currentBlockInfo.hash.toLowerCase();
    } else {
      blockRevertNeeded = true;
    }

    // Reversal of block is needed
    if (blockRevertNeeded) {
      await oThis._revertBlock();
    }

    return Promise.resolve(responseHelper.successWithData());
  }

  /**
   * checkTransactionData
   *
   * @return {Promise<void>}
   */
  async checkTransactionData() {
    const oThis = this,
      FetchBlockTransactions = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'FetchBlockTransactions');

    let fetchBlockTransactions = new FetchBlockTransactions(
      oThis.chainId,
      oThis.blockToProcess,
      oThis.currentBlockInfo.timestamp,
      false
    );

    let response = await fetchBlockTransactions.perform();

    if (response.isFailure()) return response;

    let dbTransactionsData = response.data.transactionsData,
      blockTransactions = oThis.currentBlockInfo.transactions,
      dirtyTransactions = blockTransactions.length !== Object.keys(dbTransactionsData).length;

    if (!dirtyTransactions) {
      // Loop on all transactions found from block.
      for (let index in blockTransactions) {
        let transactionHash = blockTransactions[index];
        // If transaction from block chain is not present in db OR
        // Transactions are present in db but not completely inserted in all tables.
        if (!dbTransactionsData[transactionHash] || dbTransactionsData[transactionHash].eventsParsingStatus != 0) {
          dirtyTransactions = true;
          break;
        }
      }
    }

    // If dirty transactions are present then revert complete block.
    if (dirtyTransactions) {
      await oThis._revertBlock();
    }

    return Promise.resolve(responseHelper.successWithData());
  }

  /**
   * Revert Block
   *
   * @return {Promise<void>}
   */
  async _revertBlock() {
    const oThis = this;
    let RevertBlockTransactionsData = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RevertBlockTransactionsData'),
      revertBlock = new RevertBlockTransactionsData({
        chainId: oThis.chainId,
        rawBlockData: oThis.currentBlockInfo
      });
    const resp = await revertBlock.perform();
    if (resp.isFailure()) {
      return Promise.reject(resp);
    }
    oThis.revertedBlock = true;
    return Promise.resolve(responseHelper.successWithData());
  }

  /**
   * reProcessBlock
   *
   * @return {Promise<void>}
   */
  async reProcessBlock() {
    const oThis = this,
      BlockParser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser'),
      DistributeTransactions = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DistributeTransactions'),
      blockParser = new BlockParser(oThis.chainId, {
        blockToProcess: oThis.blockToProcess
      });

    let response = await blockParser.perform();

    if (response.isFailure()) {
      return response;
    }

    let blockParserData = response.data;

    let distributeTransactions = new DistributeTransactions({
      chainId: oThis.chainId,
      rawCurrentBlock: oThis.currentBlockInfo,
      nodesWithBlock: blockParserData.nodesWithBlock
    });

    response = await distributeTransactions.perform().catch(function(err) {
      return responseHelper.error({
        internal_error_identifier: 's_b_f_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });

    if (response.isFailure()) {
      return response;
    }

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(Finalize, coreConstants.icNameSpace, 'Finalize');
