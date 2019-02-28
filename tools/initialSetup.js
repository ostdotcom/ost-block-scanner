'use strict';
/**
 * This script is used for initial setup i.e.  to create shared tables.
 *
 * Usage: node tools/initialSetup.js
 *
 * @module tools/initialSetup
 */
const program = require('commander'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Chain');
require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/shared/Economy');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');
require(rootPrefix + '/lib/models/shared/ChainCronData');

program.option('--configFile <configFile>', 'config strategy absolute file path').parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(" node tools/initialSetup.js --configFile './config.json'");
  logger.log('');
  logger.log('');
});

/**
 * Constructor for initial setup
 *
 * @class
 */
class InitialSetup {
  constructor(params) {}

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of tools/initialSetup.js::perform');
      return responseHelper.error({
        internal_error_identifier: 't_is_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: {}
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      Chain = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ChainModel'),
      Shards = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      Economy = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyModel'),
      ShardByBlock = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
      ShardByTransactions = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      ShardByEconomyAddress = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel'),
      ChainCronData = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ChainCronDataModel');

    let chainObject = new Chain({}),
      shardsObject = new Shards({}),
      economyObject = new Economy({}),
      shardByBlockObject = new ShardByBlock({}),
      shardByTransactionsObject = new ShardByTransactions({}),
      shardByEconomyAddressObject = new ShardByEconomyAddress({}),
      chainCronDataObject = new ChainCronData({});

    // Create Chain table
    await chainObject.createTable();
    // Create Shard table
    await shardsObject.createTable();
    // Create ShardByBlock table
    await shardByBlockObject.createTable();
    // Create ShardByTransactions table
    await shardByTransactionsObject.createTable();
    // Create ShardByEconomyAddress table
    await shardByEconomyAddressObject.createTable();
    // Create Economy table
    await economyObject.createTable();

    // Create ChainCronData table
    await chainCronDataObject.createTable();
  }
}

InstanceComposer.registerAsObject(InitialSetup, coreConstants.icNameSpace, 'initialSetup', true);

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.configFile) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

const config = require(program.configFile),
  instanceComposer = new InstanceComposer(config),
  setupInit = instanceComposer.getInstanceFor(coreConstants.icNameSpace, 'initialSetup');
setupInit.perform();
