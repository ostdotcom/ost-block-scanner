'use strict';
/**
 * This executable creates economy address shards for a given chain
 *
 * @module tools/createShards/byEconomyAddress
 */
const rootPrefix = '../..',
  program = require('commander'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/services/shard/create/ByEconomyAddress');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--shardNumber <shardNumber>', 'Number of block shards to be created')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node tools/createShards/byEconomyAddress.js --chainId 189 --shardNumber 1 --configFile './config.json'"
  );
  logger.log('');
  logger.log('');
});

class CreateShardsByEconomyAddress {
  /**
   * Constructor for by economy address executable.
   *
   * @param {Object} params
   * @param {String} params.chainId
   * @param {String} params.shardNumber
   * @param {String} params.configFile
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.shardNumber = params.shardNumber;
    oThis.config = require(params.configFile);

    oThis.ic = new InstanceComposer(oThis.config);
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of tools/createShards/byEconomyAddress.js');
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
      CreateShardByEconomyAddress = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'ShardByEconomyAddressService'
      );

    let createShardByEconomyAddress = new CreateShardByEconomyAddress(oThis.chainId, oThis.shardNumber);

    await createShardByEconomyAddress.perform();

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
      AvailableShardsCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardsCacheObj = new AvailableShardsCache({});

    await availableShardsCacheObj.clear();
    logger.step('Cache cleared.');
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId || !program.shardNumber || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let createShardsByEconomyAddress = new CreateShardsByEconomyAddress(program);
createShardsByEconomyAddress.perform();
