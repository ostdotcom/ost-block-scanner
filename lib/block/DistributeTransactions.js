'use strict';

/*
 * Class file for handling transaction parser and token transfer parser calls for a block
 */

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/services/transaction/Parser');
require(rootPrefix + '/services/transfer/Parser');

const MAX_TXS_PER_WORKER = 60,
  MIN_TXS_PER_WORKER = 10,
  MAX_TX_PARSER_INSTANCES = 1;

class DistributeTransactions {
  /**
   * constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.rawCurrentBlock = params.rawCurrentBlock;
    oThis.nodesWithBlock = params.nodesWithBlock;
  }

  /**
   * perform
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/block/DistributeTransactions.js');
      return responseHelper.error({
        internal_error_identifier: 'l_b_dt_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    return oThis.distributeTransactions();
  }

  /**
   * Distributes the transactions over the different nodes.
   *
   * @returns {Promise<void>}
   */
  async distributeTransactions() {
    const oThis = this;

    oThis.TransactionParser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionParser');
    oThis.TokenTransferParser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferParser');

    let transactionsInCurrentBlock = oThis.rawCurrentBlock.transactions,
      totalTransactionCount = transactionsInCurrentBlock.length,
      perBatchCount = totalTransactionCount / oThis.nodesWithBlock.length,
      offset = 0;

    // capping the per batch count both sides
    perBatchCount = perBatchCount > MAX_TXS_PER_WORKER ? MAX_TXS_PER_WORKER : perBatchCount;
    perBatchCount = perBatchCount < MIN_TXS_PER_WORKER ? MIN_TXS_PER_WORKER : perBatchCount;

    let noOfBatches = parseInt(totalTransactionCount / perBatchCount);
    noOfBatches += totalTransactionCount % perBatchCount ? 1 : 0;

    logger.log('====Batch count', noOfBatches, '====Txs per batch', perBatchCount);

    let loopCount = 1,
      promiseArray = [];

    while (loopCount <= noOfBatches) {
      let batchedTxHashes = transactionsInCurrentBlock.slice(offset, offset + perBatchCount);

      offset = offset + perBatchCount;

      if (batchedTxHashes.length === 0) break;

      let transactionParser = new oThis.TransactionParser(
        oThis.chainId,
        oThis.rawCurrentBlock,
        batchedTxHashes,
        oThis.nodesWithBlock
      );

      promiseArray.push(
        new Promise(function(onResolve, onReject) {
          transactionParser
            .perform()
            .then(function(txParserResponse) {
              // If transaction parser was successful then only token transfer parser would work.
              if (txParserResponse.isSuccess()) {
                let transactionReceiptMap = txParserResponse.data.transactionReceiptMap || {},
                  unprocessedItems = txParserResponse.data.unprocessedTransactions || [],
                  processedReceipts = {};

                let unprocessedItemsMap = {},
                  tokenParserNeeded = false;

                for (let i = 0; i < unprocessedItems.length; i++) {
                  unprocessedItemsMap[unprocessedItems[i]] = 1;
                }

                for (let txHash in transactionReceiptMap) {
                  if (!unprocessedItemsMap[txHash] && transactionReceiptMap[txHash]) {
                    processedReceipts[txHash] = transactionReceiptMap[txHash];
                    tokenParserNeeded = true;
                  }
                }

                if (tokenParserNeeded) {
                  new oThis.TokenTransferParser(
                    oThis.chainId,
                    oThis.rawCurrentBlock,
                    processedReceipts,
                    oThis.nodesWithBlock
                  )
                    .perform()
                    .then(function(ttpResp) {
                      onResolve(ttpResp);
                    })
                    .catch(function(ttpErr) {
                      onReject(ttpErr);
                    });
                } else {
                  onResolve(txParserResponse);
                }
              } else {
                logger.error('Transaction Parser returns error: ', txParserResponse.toHash());
                onResolve(txParserResponse);
              }
            })
            .catch(function(err) {
              logger.error(' Transaction Parser failed ', err);
              onReject(err);
            });
        })
      );

      if (loopCount % MAX_TX_PARSER_INSTANCES == 0) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }

      loopCount++;
    }

    if (promiseArray.length > 0) {
      await Promise.all(promiseArray);
    }

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(DistributeTransactions, coreConstants.icNameSpace, 'DistributeTransactions');
