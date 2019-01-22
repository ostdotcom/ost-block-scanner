'use strict';
/**
 * This executable creates chainId shard for a given chain
 *
 * @module tools/createShards/byChainId
 */
const rootPrefix = '../..',
  program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/services/shard/create/ByChainId');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log("    node tools/createShards/byChainId.js --chainId 1000 --configFile './config.json'");
  logger.log('');
  logger.log('');
});

/**
 * Constructor for by economy executable.
 *
 * @param {Object} params
 * @param {String} params.chainId
 * @param {String} params.shardCount
 * @param {String} params.configFile
 * @constructor
 */
class CreateShardsByChainId {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.shardCount = 1;
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
      logger.error(' In catch block of tools/createShards/byChainId');
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
      CreateShardByChainId = instanceComposer.ShardByChainIdService();

    let createShardByChainId = new CreateShardByChainId({ chainId: oThis.chainId, shardNumber: oThis.shardCount });

    await createShardByChainId.perform();

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
  if (!program.chainId || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let createShardByChainId = new CreateShardsByChainId(program);
createShardByChainId.perform();
