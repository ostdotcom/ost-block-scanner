'use strict';
/**
 * This module receives transaction receipts and token transfers to create Addresses Data for addition
 *
 * @module services/transactionsParser/CreateEconomyAddressesData
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/economyAddresses/FindCreateEconomyAddressShard');

/**
 *  Class for add transactions service
 *
 * @class
 */
class WriteBase {
  /**
   * Constructor for add transactions service
   *
   * @param params
   * @param params.transactionReceiptMap: Map of transaction receipts to insert - {trx_hash => {trx_receipt}}
   * @param params.chainId: Chain Id of transactions
   * @param params.blockNumber
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.transactionReceiptMap = params.transactionReceiptMap;
    oThis.chainId = params.chainId;
    oThis.blockNumber = params.blockNumber;
    oThis.deleteMode = params.deleteMode || false;

    oThis.economyAddressTransactionsMap = {};
    oThis.economyAddressShards = {};
    oThis.shardsNotFound = {};
    oThis.addressTrxsInsertData = {};
    oThis.insertionFailed = false;
  }

  /**
   * Main performer method
   *
   * @returns {Promise<T>}
   */
  async perform() {
    const oThis = this;

    oThis._formatAddressesData();

    logger.debug(' Transaction Economy addresses ---- ', oThis.economyAddressTransactionsMap);

    await oThis._fetchAddressesShard();

    logger.debug(' Economy addresses shards ---- ', oThis.economyAddressShards);

    oThis._formatDataAsItemsToInsert();

    logger.debug(' Economy addresses Transactions to Insert shards ---- ', oThis.addressTrxsInsertData);

    if (oThis.deleteMode) {
      await oThis._deleteAddressTransactionsData();
    } else {
      await oThis._insertAddressTransactionsData();
    }

    // Send out that some insertion is failed or shards not found for some addresses.
    return responseHelper.successWithData({
      economyAddressShardsNotFound: oThis.shardsNotFound,
      insertionFailed: oThis.insertionFailed
    });
  }

  /**
   * Fetch Address of Economy shards
   *
   */
  async _fetchAddressesShard() {
    const oThis = this;

    // Loop on economy address transactions map and create data for fetch address economy shards
    let economyAddressMap = {};
    for (let economyAddr in oThis.economyAddressTransactionsMap) {
      economyAddressMap[economyAddr] = Object.keys(oThis.economyAddressTransactionsMap[economyAddr]);
    }

    let findAddressShardklass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'FindCreateEconomyAddressShard'),
      findAddressShardsObj = new findAddressShardklass({
        chainId: oThis.chainId,
        economyAddressMap: economyAddressMap,
        blockNumber: oThis.blockNumber
      });

    let shardResponse = await findAddressShardsObj.perform();

    if (shardResponse && shardResponse.isSuccess() && shardResponse.data) {
      oThis.economyAddressShards = shardResponse.data.economyAddressShardMap;
    }

    return Promise.resolve(responseHelper.successWithData());
  }

  /**
   * Do batch insert of economy address transactions data in DDB
   *
   */
  _insertAddressTransactionsData() {
    const oThis = this;

    // Based on number of shards make entries in sharded tables in parallel.
    let insertPromises = [];
    for (let shardId in oThis.addressTrxsInsertData) {
      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          oThis
            ._getModelToInsertData(shardId)
            .batchWriteItem(oThis.addressTrxsInsertData[shardId])
            .then(function(resp) {
              if (!resp || resp.isFailure()) {
                oThis.insertionFailed = true;
                logger.error('economy address transactions insertion failed: ', resp);
              }
              onResolve();
            })
            .catch(function(err) {
              oThis.insertionFailed = true;
              logger.error('economy address transactions insertion failed: ', err);
              onResolve();
            });
        })
      );
    }

    return Promise.all(insertPromises);
  }

  /**
   * Do batch delete of economy address transactions data in DDB
   *
   */
  _deleteAddressTransactionsData() {
    const oThis = this;

    // Based on number of shards make entries in sharded tables paralelly.
    let insertPromises = [];
    for (let shardId in oThis.addressTrxsInsertData) {
      insertPromises.push(
        new Promise(function(onResolve, onReject) {
          oThis
            ._getModelToInsertData(shardId)
            .batchDeleteItem(oThis.addressTrxsInsertData[shardId], 100)
            .then(function(resp) {
              if (!resp || resp.isFailure()) {
                // TODO: Decide what to do here
              }
              onResolve();
            })
            .catch(function(err) {
              onResolve();
            });
        })
      );
    }

    return Promise.all(insertPromises);
  }
}

module.exports = WriteBase;
