'use strict';
/**
 * This executable updates the required shards
 *
 * @module /tools/updateShard
 */
const rootPrefix = '..',
  program = require('commander'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/services/UpdateShard');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--shardNumber <shardNumber>', 'Shard number')
  .option('--shardPrefix <shardPrefix>', 'Shard prefix of shards to be created')
  .option('--isAvailable <isAvailable>', 'Is the shard available for allocation?')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node tools/updateShard.js --chainId 189 --shardNumber 1 --shardPrefix block --isAvailable true --configFile './config.json'"
  );
  logger.log('');
  logger.log('');
});

class UpdateShard {
  /**
   * Constructor for update shard executable.
   *
   * @param {Object} params
   * @param {String} params.configFile
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    params.isAvailable = program.isAvailable === 'true'; // Type conversion of string to boolean.

    oThis.params = params;
    oThis.config = require(oThis.params.configFile);
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of tools/updateShard.js');
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
      UpdateShard = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'UpdateShardService');

    delete oThis.params['configFile'];

    let updateShard = new UpdateShard(oThis.params);

    await updateShard.perform();
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId || !program.shardNumber || !program.shardPrefix || !program.isAvailable || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let updateShard = new UpdateShard(program);
updateShard.perform();
