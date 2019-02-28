'use strict';
/**
 * This is executable for block-scanner, it comprises two services.
 * 1] Block Parser: get block info from chain and puts it into corresponding ddb tables.
 * It puts block identifier into shardByBlock table and its block details into sharded blocks table).
 *
 * 2] Transaction Parser:
 *
 * 3] Token Transfer Parser:
 *
 * Usage: node executables/blockScanner.js --chainId 1000 --configFile $(pwd)/config.json --startBlockNumber 0 --endBlockNumber 100
 *
 *
 * @module executables/blockScanner
 */

// TODO: Validate chain is present in our ddb and its active.

const rootPrefix = '..',
  program = require('commander'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  util = require(rootPrefix + '/lib/util'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/services/block/Parser');
require(rootPrefix + '/services/transaction/Parser');
require(rootPrefix + '/services/transfer/Parser');
require(rootPrefix + '/lib/block/DistributeTransactions');

const INTENTIONAL_BLOCK_DELAY = 24;

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .option('--startBlockNumber [startBlockNumber]', 'Starting block number')
  .option('--endBlockNumber [endBlockNumber]', 'Ending block number')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node executables/blockScanner.js --chainId 189 --configFile './config.json' --startBlockNumber 0 --endBlockNumber 100"
  );
  logger.log('');
  logger.log('');
});

/**
 * Block scanner executable class
 *
 * @class
 */
class BlockScanner {
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.config = require(params.configFile);
    oThis.startBlockNumber = parseInt(params.startBlockNumber);
    oThis.endBlockNumber = parseInt(params.endBlockNumber);
    oThis.blockToProcess = -1;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      pendingTasksPresent = false;
      logger.error(' In catch block of executables/blockScanner');
      return responseHelper.error({
        internal_error_identifier: 'e_bs_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this,
      instanceComposer = new InstanceComposer(oThis.config),
      DistributeTransactions = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'DistributeTransactions'
      );

    await oThis.init();

    let currentBlock = oThis.blockToProcess;

    while (true) {
      if ((oThis.endBlockNumber && currentBlock > oThis.endBlockNumber) || sigIntReceived) {
        break;
      }
      pendingTasksPresent = true;

      // parse the block
      let blockParser = new oThis.BlockParser(oThis.chainId, {
          blockToProcess: currentBlock,
          blockDelay: INTENTIONAL_BLOCK_DELAY
        }),
        blockParserResponse = await blockParser.perform();

      if (blockParserResponse.isSuccess()) {
        // load the obtained block level data into variables
        let blockParserData = blockParserResponse.data,
          rawCurrentBlock = blockParserData.rawCurrentBlock || {},
          nodesWithBlock = blockParserData.nodesWithBlock,
          nextBlockToProcess = blockParserData.nextBlockToProcess,
          transactions = rawCurrentBlock.transactions || [];

        if (transactions.length > 0) {
          let distributeTransaction = new DistributeTransactions({
            chainId: oThis.chainId,
            rawCurrentBlock: rawCurrentBlock,
            nodesWithBlock: nodesWithBlock
          });

          await distributeTransaction.perform();
        }

        logger.step('Current Processed block :', currentBlock, 'with Tx Count : ', transactions.length);

        // If current block is present, it means there are more blocks to process so sleep time is less.
        if (rawCurrentBlock && Object.keys(rawCurrentBlock).length > 0) {
          await util.sleep(10);
        } else {
          await util.sleep(2000);
        }

        logger.step('Next Block To Process---------:', nextBlockToProcess);

        currentBlock = nextBlockToProcess;
      } else {
        // If blockParser returns an error then sleep for 10 ms and try again.
        await util.sleep(10);
      }

      pendingTasksPresent = false;
    }

    return Promise.resolve();
  }

  async init() {
    const oThis = this,
      instanceComposer = new InstanceComposer(oThis.config);

    // if start block number and end block number are passed, then validate them
    if (oThis.startBlockNumber < 0 || oThis.endBlockNumber < 0) {
      logger.error('Please pass valid inputs.');
      return Promise.reject();
    }

    if (oThis.startBlockNumber >= 0) {
      oThis.blockToProcess = oThis.startBlockNumber;
    } else {
      //If start block number is not provided, then find highest block from table.

      let ShardByBlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
        response = await new ShardByBlockModel({
          consistentRead: 0
        }).getHighestBlock(oThis.chainId);

      oThis.blockToProcess = response.data.highestBlock + 1;
    }

    oThis.BlockParser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser');

    return Promise.resolve();
  }
}

/**
 * This method performs certain validations on the input params.
 */
let validateAndSanitize = function() {
  if (!program.chainId || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let sigIntReceived = false,
  pendingTasksPresent = false;

let blockScannerObject = new BlockScanner(program);

blockScannerObject
  .perform()
  .then(function(a) {
    process.exit(0);
  })
  .catch(function(a) {
    process.exit(1);
  });

let sigIntHandler = function() {
  sigIntReceived = true;

  if (pendingTasksPresent) {
    logger.warn(':: There are pending tasks. Waiting for completion.');
    setTimeout(sigIntHandler, 1000);
  } else {
    logger.warn(':: No pending tasks. Killing the process. ');
    process.exit(0);
  }
};

process.on('SIGINT', sigIntHandler);
process.on('SIGTERM', sigIntHandler);
