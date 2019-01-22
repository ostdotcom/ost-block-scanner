'use strict';
/**
 * This module receives economy address map to decide shards.
 *
 * @module lib/transactionParser/FindCreateEconomyAddressShard
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShards');
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');

/**
 *  Class for add transactions service
 *
 * @class
 */
class FindCreateEconomyAddressShard {
  /**
   *
   * @param params
   * @param params.economyAddressMap: Map of economy and addresses in economies to decide shards - {economy_address => [address]}
   * @param params.chainId: Chain Id
   * @param params.blockNumber
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.economyAddressMap = params.economyAddressMap;
    oThis.chainId = params.chainId;
    oThis.blockNumber = params.blockNumber;

    oThis.economyAddressShardMap = {};
    oThis.createEntryInAddrShard = {};
    oThis.availableEconomyAddrShards = null;
    oThis.consistentRead = 1;
    oThis.selectOnceAgain = {};
    oThis.updateEconomyAddressMap = {};
  }

  /**
   * Main performer method
   *
   * @returns {Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchAddressesShard(oThis.economyAddressMap);

    await oThis._createEntriesInShards();

    await oThis.updateBlockNumber();

    if (Object.keys(oThis.selectOnceAgain).length > 0) {
      await oThis._fetchAddressesShard(oThis.selectOnceAgain);
    }

    return responseHelper.successWithData({
      economyAddressShardMap: oThis.economyAddressShardMap
    });
  }

  /**
   * Fetch new shard available for inserting in economy addresses
   *
   */
  async _decideFromAvailableShards(index) {
    const oThis = this;

    if (!oThis.availableEconomyAddrShards) {
      let AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
        availableShardsCache = new AvailableShardsCache({ consistentRead: oThis.consistentRead }),
        response = await availableShardsCache.fetch();

      oThis.availableEconomyAddrShards = response.data.ea;
    }

    // This is to do round robin
    logger.debug('Available shards', oThis.availableEconomyAddrShards);
    let shardNum = index % oThis.availableEconomyAddrShards.length;
    return Promise.resolve(oThis.chainId + '_' + oThis.availableEconomyAddrShards[shardNum]);
  }

  /**
   * Map addresses to economy and assign shard to it to insert
   *
   */
  async _fetchAddressesShard(ecoAddressLocalMap) {
    const oThis = this;

    let shardByEcoAddrCacheKlass = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache');

    let promisesArr = [];

    for (let economyAddr in ecoAddressLocalMap) {
      let addresses = ecoAddressLocalMap[economyAddr];

      promisesArr.push(
        new Promise(function(onResolve, onReject) {
          new shardByEcoAddrCacheKlass({
            economyContractAddress: economyAddr,
            addresses: addresses,
            chainId: oThis.chainId,
            consistentRead: oThis.consistentRead
          })
            .fetch()
            .then(function(resp) {
              if (resp && resp.isSuccess() && resp.data) {
                logger.debug('Shard Address response ------------- ', resp.data);
                oThis.economyAddressShardMap[economyAddr] = oThis.economyAddressShardMap[economyAddr] || {};
                for (let addr in resp.data) {
                  if (resp.data[addr] && resp.data[addr]['shardIdentifier']) {
                    let shardId = resp.data[addr]['shardIdentifier'];

                    oThis.economyAddressShardMap[economyAddr][addr] = shardId;

                    if (resp.data[addr]['createdInBlock'] === 0) {
                      oThis.updateEconomyAddressMap[shardId] = oThis.updateEconomyAddressMap[shardId] || [];
                      oThis.updateEconomyAddressMap[shardId].push({
                        address: addr,
                        economyIdentifier: oThis.chainId + '-' + economyAddr,
                        shardIdentifier: shardId,
                        blockNumber: oThis.blockNumber
                      });
                    }
                  } else {
                    oThis.createEntryInAddrShard[economyAddr] = oThis.createEntryInAddrShard[economyAddr] || [];
                    oThis.createEntryInAddrShard[economyAddr].push(addr);
                  }
                }
              }
              onResolve();
            })
            .catch(function(err) {
              logger.error(' In catch block of services/FindCreateEconomyAddressShard');
              logger.error(' Could not fetch economy address shards. ', err);
              onResolve();
            });
        })
      );
    }

    await Promise.all(promisesArr);
  }

  async updateBlockNumber() {
    const oThis = this,
      promises = [];

    for (let eachShardId in oThis.updateEconomyAddressMap) {
      let ShardByEconomyAddressModel = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel'),
        shardByEconomyAddressModelObject = new ShardByEconomyAddressModel({}),
        resp = await shardByEconomyAddressModelObject.batchWriteItem(oThis.updateEconomyAddressMap[eachShardId]);
    }
  }

  async _createEntriesInShards() {
    const oThis = this;

    if (Object.keys(oThis.createEntryInAddrShard).length <= 0) {
      return Promise.resolve();
    }

    let insertPromises = [];
    let shardByEcoAdrKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel');
    for (let economyAddr in oThis.createEntryInAddrShard) {
      let addresses = oThis.createEntryInAddrShard[economyAddr];

      let ShardIdentifierByEconomyAddressCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
        shardIdentifierByEconomyAddressCache = new ShardIdentifierByEconomyAddressCache({
          economyContractAddress: economyAddr,
          addresses: addresses,
          chainId: oThis.chainId
        });

      shardIdentifierByEconomyAddressCache.clear();

      for (let i = 0; i < addresses.length; i++) {
        let addr = addresses[i],
          shardId = await oThis._decideFromAvailableShards(i),
          insertData = {
            address: addr,
            shardIdentifier: shardId,
            economyIdentifier: oThis.chainId + '-' + economyAddr,
            blockNumber: oThis.blockNumber,
            totalTransactionsOrTransfers: 0
          };

        insertPromises.push(
          new Promise(function(onResolve, onReject) {
            let modelObj = new shardByEcoAdrKlass({
              consistentRead: oThis.consistentRead
            });
            modelObj
              .putItem(insertData)
              .then(function(resp) {
                if (!resp || resp.isFailure()) {
                  if (resp.internalErrorCode.endsWith('ConditionalCheckFailedException')) {
                    // Select once again
                    oThis.selectOnceAgain[economyAddr] = oThis.selectOnceAgain[economyAddr] || [];
                    oThis.selectOnceAgain[economyAddr].push(addr);
                  }
                  onResolve();
                } else {
                  oThis.economyAddressShardMap[economyAddr] = oThis.economyAddressShardMap[economyAddr] || {};
                  oThis.economyAddressShardMap[economyAddr][addr] = shardId;
                }
                onResolve();
              })
              .catch(function(err) {
                logger.error(err);
                onResolve();
              });
          })
        );
      }
    }

    await Promise.all(insertPromises);
  }
}

InstanceComposer.registerAsShadowableClass(
  FindCreateEconomyAddressShard,
  coreConstants.icNameSpace,
  'FindCreateEconomyAddressShard'
);
