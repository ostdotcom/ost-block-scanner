'use strict';
/**
 * This executable adds the required shards for a particular chain.
 *
 * @module /tools/addChain
 */
const program = require('commander'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

require(rootPrefix + '/services/AddChain');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--networkId <networkId>', 'Network id')
  .option('--blockShardCount [blockShardCount]>', 'Number of block shards to be created')
  .option('--economyAddressShardCount [economyAddressShardCount]', 'Number of economy address shards to be created')
  .option('--transactionShardCount [transactionShardCount]', 'Number of transaction shards to be created')
  .option('--configFile <configFile>', 'Block scanner config strategy absolute file path')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node tools/addChain.js --chainId 189 --networkId 1 --blockShardCount 1 --economyAddressShardCount 1 --transactionShardCount 1 --configFile './tests/data/config.json'"
  );
  logger.log('');
  logger.log('');
});

class AddChain {
  /**
   * Constructor for add chain executable.
   *
   * @param {Object} params
   * @param {String} params.configFile
   * @constructor
   */
  constructor(params) {
    const oThis = this;

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
      logger.error(' In catch block of tools/addChain.js');
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
      AddChain = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'AddChainService');

    delete oThis.params['configFile'];

    let addChain = new AddChain(oThis.params);

    await addChain.perform();
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId || !program.networkId || !program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let addChain = new AddChain(program);
addChain.perform();
