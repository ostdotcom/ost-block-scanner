'use strict';
/**
 * Token transfer data cache
 *
 * @module lib/cacheMultiManagement/chainSpecific/TokenTransfer
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCache = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byTransaction/TokenTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');

/**
 * Class for token transfer data cache
 *
 * @class
 */
class TokenTransferCache extends BaseCache {
  /**
   * Constructor for token transfer data cache
   *
   * @augments BaseCache
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number} params.chainId
   * @param {Object} params.transactionHashEventIndexesMap
   * @param {Object} params.transactionHashesWithShardIdentifiers
   * @param {Object} params.identifiersGroupedByShardIdentifierMap
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.transactionHashEventIndexesMap = params['transactionHashEventIndexesMap'];
    oThis.transactionHashesWithShardIdentifiers = params['transactionHashesWithShardIdentifiers'] || {};
    oThis.identifiersGroupedByShardIdentifierMap = params['identifiersGroupedByShardIdentifierMap'] || {};
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

    // Call sub class method to set cache key using params provided
    oThis.setCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this,
      superRsp = await super.fetch();
    if (superRsp.isFailure()) return superRsp;

    let indexedData = {},
      TokenTransferModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel'),
      buffer;

    for (let identifierKey in superRsp.data) {
      if (!superRsp.data[identifierKey]) continue;
      buffer = TokenTransferModel.splitIdentifier(identifierKey);
      indexedData[buffer['transactionHash']] = indexedData[buffer['transactionHash']] || {
        eventIndices: [],
        transfers: {}
      };
      indexedData[buffer['transactionHash']]['eventIndices'].push(buffer['eventIndex']);
      indexedData[buffer['transactionHash']]['transfers'][buffer['eventIndex']] = superRsp.data[identifierKey];
    }

    return responseHelper.successWithData(indexedData);
  }

  /**
   * Set cache keys
   *
   * @returns {{}}
   */
  setCacheKeys() {
    const oThis = this,
      identifierToRawDetailsMap = {};

    for (let txHash in oThis.transactionHashEventIndexesMap) {
      let eventIndexes = oThis.transactionHashEventIndexesMap[txHash];

      for (let i = 0; i < eventIndexes.length; i++) {
        let identifier = `${txHash}-${eventIndexes[i]}`;
        identifierToRawDetailsMap[identifier] = {
          transactionHash: txHash,
          eventIndex: eventIndexes[i]
        };
        oThis.cacheKeys[
          `${oThis._cacheKeyPrefix()}cs_tt_${oThis.chainId}_${txHash.toLowerCase()}_${eventIndexes[i]}`
        ] = identifier;
      }
    }

    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);

    oThis.identifierToRawDetailsMap = identifierToRawDetailsMap;

    return oThis.cacheKeys;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 900; // 15 minutes

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
   * @param {Array} cacheMissIdentifiers
   *
   * @returns {Result}
   */
  async fetchDataFromSource(cacheMissIdentifiers) {
    const oThis = this,
      identifiersGroupedByShardIdentifierMap = {},
      TokenTransferModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel'),
      responseData = {};

    let txHashesWithNoShardId = [];

    for (let i = 0; i < cacheMissIdentifiers.length; i++) {
      let identifier = cacheMissIdentifiers[i];

      let transactionHash = oThis.identifierToRawDetailsMap[identifier]['transactionHash'];
      if (!oThis.transactionHashesWithShardIdentifiers[transactionHash]) {
        txHashesWithNoShardId.push(transactionHash);
      }
    }

    // Fetch shardIdentifiers only if needed.
    if (txHashesWithNoShardId.length > 0) {
      let ShardIdentifierByTransactionCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache'),
        getShardRsp = await new ShardIdentifierByTransactionCache({
          chainId: oThis.chainId,
          transactionHashes: txHashesWithNoShardId,
          consistentRead: oThis.consistentRead
        }).fetch();

      if (getShardRsp.isFailure()) {
        return Promise.reject(getShardRsp);
      }

      for (let txHash in getShardRsp.data) {
        let buffer = getShardRsp.data[txHash];
        if (buffer && buffer['shardIdentifier']) {
          identifiersGroupedByShardIdentifierMap[buffer['shardIdentifier']] =
            identifiersGroupedByShardIdentifierMap[buffer['shardIdentifier']] || {};
          identifiersGroupedByShardIdentifierMap[buffer['shardIdentifier']][txHash] =
            oThis.transactionHashEventIndexesMap[txHash];
        }
      }
    }

    // Merge the two objects.
    for (let shardIdentifier in oThis.identifiersGroupedByShardIdentifierMap) {
      if (identifiersGroupedByShardIdentifierMap[shardIdentifier]) {
        Object.assign(
          identifiersGroupedByShardIdentifierMap[shardIdentifier],
          oThis.identifiersGroupedByShardIdentifierMap[shardIdentifier]
        );
      } else {
        identifiersGroupedByShardIdentifierMap[shardIdentifier] =
          oThis.identifiersGroupedByShardIdentifierMap[shardIdentifier];
      }
    }

    // Group txHashes by shard identifiers they are present in.
    let promises = [];
    for (let shardIdentifier in identifiersGroupedByShardIdentifierMap) {
      let promise = new TokenTransferModel({
        chainId: oThis.chainId,
        shardIdentifier: shardIdentifier,
        consistentRead: oThis.consistentRead
      }).getTransfers(identifiersGroupedByShardIdentifierMap[shardIdentifier]);

      promise.then(function(queryRsp) {
        // Do not change the line below because we do not want to send multiple RESULT objects in responseData.
        // In the line below, we are consolidating all the data objects and sending out one RESULT object.
        Object.assign(responseData, queryRsp.data);
      });

      promises.push(promise);
    }

    await Promise.all(promises);

    return Promise.resolve(responseHelper.successWithData(responseData));
  }
}

InstanceComposer.registerAsShadowableClass(TokenTransferCache, coreConstants.icNameSpace, 'TokenTransferCache');

module.exports = TokenTransferCache;
