'use strict';
/**
 * This executable creates transaction shards for a given chain
 *
 * @module tools/createShards/byTransaction
 */
const rootPrefix = '../..',
  program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/services/shard/create/ByTransaction');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--shardCount <shardCount>', 'Number of block shards to be created')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log("    node tools/createShards/byTransaction.js --chainId 189 --shardCount 1 --configFile './config.json'");
  logger.log('');
  logger.log('');
});

/**
 * Constructor for by transaction executable.
 *
 * @param {Object} params
 * @param {String} params.chainId
 * @param {String} params.shardCount
 * @param {String} params.configFile
 * @constructor
 */
class CreateShardByTransaction {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.shardCount = params.shardCount;
    oThis.config = require(params.configFile);
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of tools/createShards/byTransaction.js');
      logger.error(err);
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      instanceComposer = new InstanceComposer(oThis.config),
      CreateShardByTransaction = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'ShardByTransactionService'
      );

    for (let ind = 0; ind < oThis.shardCount; ind++) {
      let createShardByTransaction = new CreateShardByTransaction({ chainId: oThis.chainId, shardNumber: ind + 1 });

      await createShardByTransaction.perform();
    }

    // Clear cache.
    await oThis._clearCache();
  }

  /**
   * Clears the required caches.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _clearCache() {
    const oThis = this,
      AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardsCacheObj = new AvailableShardsCache({});

    await availableShardsCacheObj.clear();
    logger.step('Cache cleared.');
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId || !program.shardCount || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let createByTransaction = new CreateShardByTransaction(program);
createByTransaction.perform();
