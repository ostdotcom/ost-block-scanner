'use strict';
/**
 * This module receives block number and fetch all transactions and transfers of the block.
 *
 * @module lib/block/FetchTransactions
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const InstanceComposer = OSTBase.InstanceComposer;

const errorConfig = basicHelper.getErrorConfig();

const batchGetPaginationSize = 80;

require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/Transaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/TokenTransfer');

/**
 * Class for Fetching block transactions and transfers
 *
 * @class
 */
class FetchBlockTransactions {
  /**
   * Constructor for TokenTransferParser
   *
   * @param {Number} chainId: chain id
   * @param {Number} blockNumber: Block number to fetch transactions for
   * @param {Number} blockTimestamp: Block timestamp to fetch transactions for block
   * @param {Boolean} fetchTokenTransfers: Transfer events are required or not for a block.
   * @param {Array} newTransactionsOfBlock: New transactions which are found in block after forking.
   *
   * @constructor
   */
  constructor(chainId, blockNumber, blockTimestamp, fetchTokenTransfers, newTransactionsOfBlock) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockNumber = blockNumber;
    oThis.blockTimestamp = blockTimestamp;
    oThis.fetchTokenTransfers = fetchTokenTransfers;
    oThis.newTransactionsOfBlock = newTransactionsOfBlock || [];
    oThis.shardTransactionsMap = {};
    oThis.transactionHashesData = {};
    oThis.tokenTransfersData = {};
    oThis.consistentRead = 1;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/block/FetchTransactions');
      return responseHelper.error({
        internal_error_identifier: 'l_b_ft_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    // Fetch transactions of a block
    let blockTrxResp = await oThis._fetchTransactionAndShardsOfBlock();
    if (blockTrxResp.isFailure()) {
      return responseHelper.error({
        internal_error_identifier: 'l_b_ft_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Could not fetch transactions and shards for given block ' + oThis.blockNumber,
        error_config: errorConfig
      });
    }

    // If there are new transactions in block then fetch that too.
    if (oThis.newTransactionsOfBlock.length > 0) {
      let extraTrxResponse = await oThis._fetchTransactionShards(oThis.newTransactionsOfBlock);
      if (extraTrxResponse.isFailure()) {
        return responseHelper.error({
          internal_error_identifier: 'l_b_ft_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: 'Could not fetch transactions and shards for given block ' + oThis.blockNumber,
          error_config: errorConfig
        });
      }
    }

    // Fetch transactions
    let trxResp = await oThis._fetchTransactions();
    if (trxResp.isFailure()) {
      return responseHelper.error({
        internal_error_identifier: 'l_b_ft_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: 'Could not fetch transactions details for given block ' + oThis.blockNumber,
        error_config: errorConfig
      });
    }

    if (oThis.fetchTokenTransfers) {
      await oThis._fetchTokenTransfers();
    }

    return responseHelper.successWithData({
      transactionsData: oThis.transactionHashesData,
      tokenTransfers: oThis.tokenTransfersData,
      shardTransactionsMap: oThis.shardTransactionsMap
    });
  }

  /**
   * Fetch transactions and shard ids of a block
   *
   * @returns {Promise<void>}
   */
  async _fetchTransactionAndShardsOfBlock() {
    const oThis = this;

    let shardByTrxModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      shardByTrxObj = new shardByTrxModel({ pageSize: batchGetPaginationSize }),
      ShardIdentifierByTransactionCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache');

    let nextPagePayload = null,
      promisesArray = [];
    while (true) {
      let transactionResponse = await shardByTrxObj.getTransactionHashesByBlockNo(
        oThis.chainId,
        oThis.blockTimestamp,
        nextPagePayload
      );

      if (transactionResponse.isSuccess()) {
        // Transaction hashes are fetched
        let transactionHashes = transactionResponse.data.transactionHashes;
        nextPagePayload = transactionResponse.data.nextPagePayload.LastEvaluatedKey;

        // Fetch shard identifiers of the above transactions
        promisesArray.push(
          oThis._fetchTransactionShards(transactionHashes)
          // new Promise(function(onResolve, onReject) {
          //   new ShardIdentifierByTransactionCache({
          //     chainId: oThis.chainId,
          //     transactionHashes: transactionHashes,
          //     consistentRead: oThis.consistentRead
          //   })
          //     .fetch()
          //     .then(function(getShardRsp) {
          //       if (getShardRsp.isSuccess()) {
          //         // Group txHashes by shard identifiers they are present in.
          //         for (let i = 0; i < transactionHashes.length; i++) {
          //           let txHash = transactionHashes[i],
          //             shardIdentifier = (getShardRsp.data[txHash] || {})['shardIdentifier'];
          //
          //           if (shardIdentifier) {
          //             oThis.shardTransactionsMap[shardIdentifier] = oThis.shardTransactionsMap[shardIdentifier] || [];
          //             oThis.shardTransactionsMap[shardIdentifier].push(txHash);
          //           } else {
          //             onReject(
          //               responseHelper.error({
          //                 internal_error_identifier: 'l_b_ft_4',
          //                 api_error_identifier: 'something_went_wrong',
          //                 debug_options: 'Could not fetch shard for transaction ' + txHash,
          //                 error_config: errorConfig
          //               })
          //             );
          //           }
          //         }
          //         onResolve(getShardRsp);
          //       } else {
          //         logger.error('Error while fetching shard of transactions.');
          //         onReject(getShardRsp);
          //       }
          //     });
          // })
        );
      } else {
        nextPagePayload = null;
      }

      // Last page has been reached
      if (!nextPagePayload) {
        break;
      }
    }

    // Fetch shard identifiers of all transactions.
    if (promisesArray.length > 0) {
      await Promise.all(promisesArray);
    }

    return responseHelper.successWithData({});
  }

  _fetchTransactionShards(transactionHashes) {
    const oThis = this,
      ShardIdentifierByTransactionCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByTransactionCache');

    let shardNotFoundTx = [],
      shardFoundTx = [];
    return new Promise(function(onResolve, onReject) {
      new ShardIdentifierByTransactionCache({
        chainId: oThis.chainId,
        transactionHashes: transactionHashes,
        consistentRead: oThis.consistentRead
      })
        .fetch()
        .then(function(getShardRsp) {
          if (getShardRsp.isSuccess()) {
            // Group txHashes by shard identifiers they are present in.
            for (let i = 0; i < transactionHashes.length; i++) {
              let txHash = transactionHashes[i],
                shardIdentifier = (getShardRsp.data[txHash] || {})['shardIdentifier'];

              if (shardIdentifier) {
                oThis.shardTransactionsMap[shardIdentifier] = oThis.shardTransactionsMap[shardIdentifier] || [];
                oThis.shardTransactionsMap[shardIdentifier].push(txHash);
                shardFoundTx.push(txHash);
              } else {
                shardNotFoundTx.push(txHash);
              }
            }
            onResolve({
              shardsFoundTx: shardFoundTx,
              shardNotFoundTx: shardNotFoundTx
            });
          } else {
            logger.error('Error while fetching shard of transactions.');
            onReject(getShardRsp);
          }
        })
        .catch(function(err) {
          logger.error('Exception while fetching shard of transactions: ', err);
          onReject(err);
        });
    });
  }

  /**
   * Fetch transactions from ddb
   *
   * @returns {Promise<void>}
   */
  async _fetchTransactions() {
    const oThis = this;

    let promisesArray = [],
      TransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel');

    for (let shardIdentifier in oThis.shardTransactionsMap) {
      let batchedTransactions = null,
        offset = 0;
      while (true) {
        batchedTransactions = oThis.shardTransactionsMap[shardIdentifier].slice(
          offset,
          batchGetPaginationSize + offset
        );

        if (batchedTransactions.length <= 0) {
          break;
        }

        let promise = new TransactionModel({
          chainId: oThis.chainId,
          shardIdentifier: shardIdentifier,
          consistentRead: oThis.consistentRead
        }).getTransactions(batchedTransactions);

        promise.then(function(resp) {
          // Do not change the line below because we do not want to send multiple RESULT objects in responseData.
          // In the line below, we are consolidating all the data objects and sending out one RESULT object.
          Object.assign(oThis.transactionHashesData, resp.data);
        });

        promisesArray.push(promise);
        offset += batchGetPaginationSize;
      }
    }

    await Promise.all(promisesArray);

    return responseHelper.successWithData({});
  }

  /**
   * Fetch transfers from ddb
   *
   * @returns {Promise<void>}
   */
  async _fetchTokenTransfers() {
    const oThis = this;

    let promisesArray = [];

    for (let shardIdentifier in oThis.shardTransactionsMap) {
      let batchedTransfersData = {},
        batchCount = 0;
      for (let i = 0; i < oThis.shardTransactionsMap[shardIdentifier].length; i++) {
        let txHash = oThis.shardTransactionsMap[shardIdentifier][i],
          trxData = oThis.transactionHashesData[txHash];
        if (!trxData) {
          continue;
        }

        let indx = 1,
          eventsArr = [];
        while (indx <= parseInt(trxData.totalTokenTransfers)) {
          eventsArr.push(indx);
          indx += 1;
        }
        // If transfers are present then add
        if (eventsArr.length > 0) {
          batchedTransfersData[txHash] = eventsArr;
        }
        batchCount += eventsArr.length;

        // Dynamo query cannot take more than these records in batch get so make a query and release it.
        if (batchCount >= batchGetPaginationSize) {
          promisesArray.push(oThis._sendBatchGetTransfers(shardIdentifier, batchedTransfersData));
          batchCount = 0;
          batchedTransfersData = {};
        }
      }
      // If any records in batch still to process
      if (Object.keys(batchedTransfersData).length > 0) {
        promisesArray.push(oThis._sendBatchGetTransfers(shardIdentifier, batchedTransfersData));
      }
    }

    await Promise.all(promisesArray);

    return responseHelper.successWithData({});
  }

  /**
   * Send get transfers request for batch of transactions
   *
   * @returns {Promise<void>}
   */
  _sendBatchGetTransfers(shardIdentifier, transactionEventMap) {
    const oThis = this;

    let TransferModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel');

    let promise = new TransferModel({
      chainId: oThis.chainId,
      shardIdentifier: shardIdentifier,
      consistentRead: oThis.consistentRead
    }).getTransfers(transactionEventMap);

    promise.then(function(resp) {
      // Do not change the line below because we do not want to send multiple RESULT objects in responseData.
      // In the line below, we are consolidating all the data objects and sending out one RESULT object.
      for (let ttIndex in resp.data) {
        let tokenTransfer = resp.data[ttIndex],
          txHash = ttIndex.split('-')[0];

        oThis.tokenTransfersData[txHash] = oThis.tokenTransfersData[txHash] || [];
        oThis.tokenTransfersData[txHash].push(tokenTransfer);
      }
    });

    return promise;
  }
}

InstanceComposer.registerAsShadowableClass(FetchBlockTransactions, coreConstants.icNameSpace, 'FetchBlockTransactions');
