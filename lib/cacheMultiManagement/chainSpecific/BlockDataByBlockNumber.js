'use strict';
/**
 * Cache class to get block data of particular blocks
 *
 * @module /lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byBlock/Block');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByBlock');

/**
 * Class for block data by block number cache
 *
 * @class
 */
class BlockDataByBlockNumberCache extends BaseCache {
  /**
   * Constructor for block data by block number cache
   *
   * @augments BaseCache
   * @param {Object} params: cache key generation & expiry related params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.blockNumbers = params['blockNumbers'];
    oThis.blockNumberToShardIdentifierMap = params.blockNumberToShardIdentifierMap || {};
    oThis.shardIdentifierToBlockNumberMap = params.shardIdentifierToBlockNumberMap || {};
    oThis.consistentBehavior = '1';
    oThis.useObject = false;

    // call sub class method to set cache key using params provided
    oThis.setCacheKeys();

    // call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Set cache keys
   *
   * @returns {String}
   */
  setCacheKeys() {
    const oThis = this;
    for (let i = 0; i < oThis.blockNumbers.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'bd_bn_' + oThis.chainId + '_' + oThis.blockNumbers[i]] =
        oThis.blockNumbers[i];
    }
    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);
    return oThis.cacheKeys;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 86400; // 24 hours
    return oThis.cacheExpiry;
  }

  /**
   * Set cache implementer in oThis.cacheImplementer and return it
   *
   * @returns {Object}
   */
  setCacheImplementer() {
    const oThis = this,
      cacheObject = oThis
        .ic()
        .getInstanceFor(coreConstants.icNameSpace, 'cacheProvider')
        .getInstance(storageConstants.sharded, oThis.chainId);
    oThis.cacheImplementer = cacheObject.cacheInstance;

    return oThis.cacheImplementer;
  }

  /**
   * Fetch data from source
   *
   * @param {Array} cacheMissBlockNumbers: Array of all the block numbers where cache was missed.
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissBlockNumbers) {
    const oThis = this,
      blockNumbersWhoseShardIsNeeded = [];

    for (let index = 0; index < cacheMissBlockNumbers.length; index++) {
      let blockNumber = cacheMissBlockNumbers[index],
        shardIdentifier = oThis.blockNumberToShardIdentifierMap[blockNumber];

      if (!shardIdentifier) {
        blockNumbersWhoseShardIsNeeded.push(blockNumber);
      }
    }

    // The below block fetches the shard identifiers for the passed blocks.
    let params = {
        chainId: oThis.chainId,
        blockNumbers: blockNumbersWhoseShardIsNeeded,
        consistentRead: oThis.consistentRead
      },
      ByBlockShardIdentifierCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByBlockNoCache'),
      ByBlockShardIdentifierCacheResponse = await new ByBlockShardIdentifierCache(params).fetch();

    let shardIdentifiersData = ByBlockShardIdentifierCacheResponse.data,
      shardIdentifierToBlockNumberMap = {},
      blockNumberToDataMap = {},
      promiseArray = [],
      blockDataParams = {
        chainId: oThis.chainId
      };

    // This block assigns block numbers to the shards that they belong to.
    for (let index in blockNumbersWhoseShardIsNeeded) {
      let blockNumber = blockNumbersWhoseShardIsNeeded[index];

      if (Object.keys(shardIdentifiersData[blockNumber]).length === 0) {
        /// This is a check to determine if the given block number's shard identifier exists or not.
        blockNumberToDataMap[blockNumber] = {};
      } else {
        // This block formats data in a map indexed by shard identifier.
        // Value in the key value pair is an array containing block numbers that the given shard contains.
        if (!shardIdentifierToBlockNumberMap[shardIdentifiersData[blockNumber.toString()]['shardIdentifier']]) {
          shardIdentifierToBlockNumberMap[shardIdentifiersData[blockNumber.toString()]['shardIdentifier']] = [
            blockNumber
          ];
        } else {
          shardIdentifierToBlockNumberMap[shardIdentifiersData[blockNumber.toString()]['shardIdentifier']].push(
            blockNumber
          );
        }
      }
    }

    // This block checks whether the shardIdentifiers passed in the params already exist in the shardIdentifiers
    // fetched earlier.
    for (let shardIdentifier in oThis.shardIdentifierToBlockNumberMap) {
      // If the shard identifier passed in the params exists in the shardIdentifiers map fetched earlier,
      // the block numbers of the maps are merged.
      if (shardIdentifierToBlockNumberMap[shardIdentifier]) {
        for (let index = 0; index < oThis.shardIdentifierToBlockNumberMap[shardIdentifier].length; index++) {
          shardIdentifierToBlockNumberMap[shardIdentifier].push(
            oThis.shardIdentifierToBlockNumberMap[shardIdentifier][index]
          );
        }
      }
      // Else a new entry is created in the shardIdentifierToBlockNumberMap.
      else {
        shardIdentifierToBlockNumberMap[shardIdentifier] = oThis.shardIdentifierToBlockNumberMap[shardIdentifier];
      }
      // This block fetches all the unique block numbers from the shardIdentifierToBlockNumberMap and ensures
      // all the entries are numbers. An array of block numbers associated with the particular shardIdentifier is returned.
      shardIdentifierToBlockNumberMap[shardIdentifier] = [
        ...new Set(shardIdentifierToBlockNumberMap[shardIdentifier].map(Number))
      ];
    }

    // This block fetches the block details for the passed block numbers belonging to the shardIdentifier.
    for (let shardIdentifier in shardIdentifierToBlockNumberMap) {
      blockDataParams['shardIdentifier'] = shardIdentifier;
      let BlockModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel'),
        BlockModelObject = new BlockModelKlass(blockDataParams);

      promiseArray.push(BlockModelObject.getBlockDetails(shardIdentifierToBlockNumberMap[shardIdentifier]));
    }

    let promiseReplyArray = await Promise.all(promiseArray);

    for (let index in promiseReplyArray) {
      Object.assign(blockNumberToDataMap, promiseReplyArray[index].data);
    }

    return Promise.resolve(responseHelper.successWithData(blockNumberToDataMap));
  }
}

InstanceComposer.registerAsShadowableClass(
  BlockDataByBlockNumberCache,
  coreConstants.icNameSpace,
  'BlockDataByBlockNoCache'
);

module.exports = BlockDataByBlockNumberCache;
