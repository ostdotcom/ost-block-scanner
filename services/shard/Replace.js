'use strict';
/**
 * This service creates a new shard, deactivates previous shards of the same chain and clears the cache at the end.
 *
 * @module services/shard/Replace
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes'),
  shardTypeConstants = require(rootPrefix + '/lib/globalConstant/shardType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/services/UpdateShard');
require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/services/shard/create/ByBlock');
require(rootPrefix + '/services/shard/create/ByTransaction');
require(rootPrefix + '/services/shard/create/ByEconomyAddress');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');

// Define serviceType for getting signature.
const serviceType = serviceTypes.ReplaceShard;

/**
 * Class for creating a new shard
 *
 * @class
 */
class Replace extends ServicesBase {
  /**
   * Constructor for creating a new shard
   *
   * @augments CreateShardsBase
   *
   * @param {String} shardType: ('block', 'transaction', 'economyAddress', 'economyContractAddress')
   * @param {Number} chainId
   * @param {Number} shardNumber
   *
   * @constructor
   */
  constructor(shardType, chainId, shardNumber) {
    const params = { shardType: shardType, chainId: chainId, shardNumber: shardNumber };
    super(params, serviceType);

    const oThis = this;

    oThis.shardType = shardType;
    oThis.chainId = chainId;
    oThis.shardNumber = shardNumber;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    // Select the type of service.
    await oThis._selectService();

    // Fetch available shards for the shardType and perform existing shardNumber validation.
    await oThis._getAvailableShards();

    // Create new shard(s) and entry in shards table.
    await oThis._createNewShard();

    // Mark previous shards as unavailable for allocation.
    await oThis._markPreviousShardsUnavailable();

    // Clear cache.
    await oThis._clearCache();
  }

  /**
   * Selects the shardType whose entries need to be updated.
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  _selectService() {
    const oThis = this;

    if (oThis.shardType === shardTypeConstants.blockShard) {
      oThis.shardService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockService');
      oThis.shardPrefix = shardTypeConstants.blockShard;
    } else if (oThis.shardType === shardTypeConstants.economyContractAddressShard) {
      oThis.shardService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyService');
      oThis.shardPrefix = shardTypeConstants.economyContractAddressShard;
    } else if (oThis.shardType === shardTypeConstants.economyAddressShard) {
      oThis.shardService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressService');
      oThis.shardPrefix = shardTypeConstants.economyAddressShard;
    } else if (oThis.shardType === shardTypeConstants.transactionShard) {
      oThis.shardService = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionService');
      oThis.shardPrefix = shardTypeConstants.transactionShard;
    } else {
      logger.error('Invalid shard type.');
      return Promise.reject('Invalid shard type.');
    }
  }

  /**
   * Fetches all the available shards for the chainId and shardType and performs some validations on existing shardNumbers.
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _getAvailableShards() {
    const oThis = this,
      shardServiceObj = new oThis.shardService(oThis.chainId, oThis.shardNumber),
      shardIdentifier = shardServiceObj.identifier;

    const ShardModelClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObj = new ShardModelClass({}),
      shardModelResponse = await shardModelObj.getAvailableShardsOf(shardIdentifier),
      shortNameForShardNumber = shardModelObj.shortNameFor('shardNumber'),
      dataTypeForShardNumber = shardModelObj.shortNameToDataType[shortNameForShardNumber];

    let response = shardModelResponse.data.Items;
    oThis.shardsToBeUpdated = [];

    if (response.length === 0) {
      return Promise.reject('Incorrect chainId passed. No shard exists with the given chainId.');
    }

    // Get shard updateParams.
    for (let index = 0; index < response.length; index++) {
      let shardNumber = response[index][shortNameForShardNumber][dataTypeForShardNumber];

      // If shardNumber already exists, return error.
      if (+shardNumber === oThis.shardNumber) {
        // Implicit string to int conversion.
        return Promise.reject('shardNumber passed already exists.');
      } else {
        const updateParams = {
          chainId: oThis.chainId,
          shardNumber: shardNumber,
          shardPrefix: oThis.shardPrefix,
          isAvailable: false
        };
        oThis.shardsToBeUpdated.push(updateParams);
      }
    }
  }

  /**
   * Creates new shard.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _createNewShard() {
    const oThis = this,
      shardServiceObj = new oThis.shardService(oThis.chainId, oThis.shardNumber);

    await shardServiceObj.perform();
    logger.step('New shards created.');
  }

  /**
   * Marks all the available shards as unavailable.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _markPreviousShardsUnavailable() {
    const oThis = this,
      UpdateShardServiceClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateShardService'),
      promises = [];

    // Loop over all available shards and mark them unavailable.
    for (let index = 0; index < oThis.shardsToBeUpdated.length; index++) {
      let updateParams = oThis.shardsToBeUpdated[index],
        chainId = updateParams.chainId,
        shardNumber = updateParams.shardNumber,
        shardPrefix = updateParams.shardPrefix,
        isAvailable = updateParams.isAvailable,
        updateShardServiceObj = new UpdateShardServiceClass(chainId, shardNumber, shardPrefix, isAvailable);

      promises.push(updateShardServiceObj.perform());
    }

    await Promise.all(promises);
    logger.step('Previous shards marked unavailable.');
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

InstanceComposer.registerAsShadowableClass(Replace, coreConstants.icNameSpace, 'Replace');

module.exports = Replace;
