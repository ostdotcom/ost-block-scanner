'use strict';
/**
 * This is executable for aggregator, it aggregates data of transactions and update certain counts in various tables.
 *
 * Usage: node executables/aggregator.js --chainId 1000 --configFile $(pwd)/config.json
 *
 *
 * @module executables/aggregator
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

require(rootPrefix + '/services/economy/Aggregator');
require(rootPrefix + '/lib/models/shared/ChainCronData');
require(rootPrefix + '/lib/models/shared/ShardByBlock');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log("    node executables/aggregator.js --chainId 189 --configFile './config.json'");
  logger.log('');
  logger.log('');
});

/**
 * Aggregator executable class
 *
 * @class
 */
class DataAggregator {
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.config = require(params.configFile);
    oThis.blockToProcess = 0;
    oThis.lastFinalizedBlock = 0;

    oThis.chainCronModel = null;
    oThis.economyAggregator = null;
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
      logger.error(' In catch block of executables/aggregator');
      return responseHelper.error({
        internal_error_identifier: 'e_ag_1',
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
    const oThis = this;

    await oThis.init();

    let currentBlock = oThis.blockToProcess;

    while (true) {
      if (currentBlock > oThis.lastFinalizedBlock || sigIntReceived) {
        break;
      }
      pendingTasksPresent = true;

      // parse the block
      let aggregator = new oThis.economyAggregator(oThis.chainId, currentBlock),
        economyAggrResponse = await aggregator.perform();

      if (economyAggrResponse.isSuccess()) {
        // Mark block aggregated in DB
        let insertParams = {
          chainId: oThis.chainId,
          lastAggregatedBlock: currentBlock
        };

        await new oThis.chainCronModel({ consistentRead: 1 }).updateItem(insertParams);

        // If aggregator has reached till finalized block then wait for 2 seconds and then kill
        if (currentBlock == oThis.lastFinalizedBlock) {
          await util.sleep(2000);
        } else {
          await util.sleep(10);
        }
        currentBlock += 1;
      } else {
        // If Aggregator returns an error then sleep for 1 second and try again.
        await util.sleep(1000);
      }

      pendingTasksPresent = false;
    }

    return Promise.resolve();
  }

  async init() {
    const oThis = this,
      instanceComposer = new InstanceComposer(oThis.config);

    oThis.chainCronModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ChainCronDataModel');

    let chainCronDataObj = new oThis.chainCronModel({ consistentRead: 1 });

    let chainDataResp = await chainCronDataObj.getCronData(oThis.chainId);

    if (!chainDataResp[oThis.chainId.toString()] || chainDataResp[oThis.chainId.toString()].lastAggregatedBlock == 0) {
      oThis.blockToProcess = 1;
    } else {
      oThis.blockToProcess = parseInt(chainDataResp[oThis.chainId.toString()].lastAggregatedBlock) + 1;
    }

    let ShardByBlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      response = await new ShardByBlockModel({
        consistentRead: 0
      }).getHighestBlock(oThis.chainId);

    oThis.lastFinalizedBlock = response.data.highestBlock;

    oThis.economyAggregator = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAggregator');

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

let dataAggregatorObject = new DataAggregator(program);

dataAggregatorObject
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
