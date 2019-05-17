'use strict';

/*
 * Class file for checking if a particular block on a chain is processable
 */

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic');

const errorConfig = basicHelper.getErrorConfig(),
  InstanceComposer = OSTBase.InstanceComposer;

// After FORCE_PROCESSING_DELAY, we will assume that the chain has stopped creating new blocks and
// will force process all the blocks
const FORCE_PROCESSING_DELAY = 15; // time in minutes

class CheckIfProcessable {
  /**
   * constructor
   *
   * @param params
   * @param params.chainId - chainId of the block
   * @param params.blockToProcess - block number to check
   * @param params.blockDelay - delay for checking if block can be processed
   *
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.blockToProcess = params.blockToProcess;
    oThis.blockDelay = params.blockDelay;

    oThis.nodesWithBlock = [];
    oThis.highestBlock = -1;
    oThis.highestBlockTs = -1;
  }

  /**
   * perform
   *
   */
  async perform() {
    const oThis = this;

    logger.log('======Before calling getHighestBlockFromChain');

    // get the highest block from the chain nodes
    await oThis.getHighestBlockFromChain();

    if (oThis.blockDelay < 0) {
      oThis.blockDelay = 0;
    }

    let currentTime = Math.floor(Date.now() / 1000);
    let chainHalted = currentTime - oThis.highestBlockTs > FORCE_PROCESSING_DELAY * 60000;
    let chainSufficientlyAhead = oThis.highestBlock - oThis.blockToProcess >= oThis.blockDelay;
    let chainFullyParsed = oThis.highestBlock >= oThis.blockToProcess;

    let result = {};

    result['blockProcessable'] = true;

    // process block only if (chain is sufficiently ahead OR chain halted) AND chain not fully processed
    if (!((chainSufficientlyAhead || chainHalted) && chainFullyParsed)) {
      result['blockProcessable'] = false;
    }

    if (result['blockProcessable']) {
      let blockInfoRsp = await oThis.getBlockInfo();

      result['blockInfo'] = blockInfoRsp.data;
      result['nodesWithBlock'] = oThis.nodesWithBlock;
    }

    logger.log('======returning from check if processable====');
    return responseHelper.successWithData(result);
  }

  /**
   * This function set the highest block and nodes with block to be processed
   *
   * @returns {Promise<void>}
   */
  async getHighestBlockFromChain() {
    const oThis = this,
      configFormatter = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'configFormatter');
    oThis.config = configFormatter.configFor(oThis.chainId);

    let providers = basicHelper.getProvidersFromNode(oThis.config.nodes);

    for (let i in providers) {
      let provider = providers[i];
      await oThis.refreshHighestBlock(provider);
    }

    logger.log('====Highest block fetched===');
  }

  /**
   * This function updates highest block if changed
   *
   * @param provider
   * @returns {Promise<{}>}
   */
  async refreshHighestBlock(provider) {
    const oThis = this;

    let web3Interact = await web3Provider.getInstance(provider);

    let highestBlockNumberOfProvider = null,
      highestBlockOfProvider = null;

    try {
      highestBlockOfProvider = await web3Interact.getBlock('latest');
      highestBlockNumberOfProvider = highestBlockOfProvider.number;
      logger.log('highestBlockNumberOfProvider: ', highestBlockNumberOfProvider);
    } catch (err) {
      logger.error('Cannot get block from provider', provider);
      return;
    }

    if (highestBlockNumberOfProvider > oThis.highestBlock) {
      oThis.highestBlock = highestBlockNumberOfProvider;
      oThis.highestBlockTs = highestBlockOfProvider.timestamp;
    }

    if (highestBlockNumberOfProvider >= oThis.blockToProcess) {
      oThis.nodesWithBlock.push(provider);
    }

    logger.win('* Obtained highest block on', provider, 'as', oThis.highestBlock);

    return Promise.resolve({});
  }

  /**
   * Get current block info from first node which hash that block
   *
   * @returns {Promise<void>}
   */
  async getBlockInfo() {
    const oThis = this;

    let index = 0,
      blockInfo = {};

    while (index < oThis.nodesWithBlock.length) {
      let web3Interact = await web3Provider.getInstance(oThis.nodesWithBlock[index]);

      try {
        blockInfo = await web3Interact.getBlock(oThis.blockToProcess);
      } catch (err) {
        // do nothing, get from other node
      }
      if (blockInfo) {
        break;
      }
      index += 1;
    }

    return responseHelper.successWithData(blockInfo);
  }
}

InstanceComposer.registerAsShadowableClass(CheckIfProcessable, coreConstants.icNameSpace, 'CheckIfBlockProcessable');
