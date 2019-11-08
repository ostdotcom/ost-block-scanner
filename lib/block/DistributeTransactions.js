'use strict';

/*
 * Class file for handling transaction parser and token transfer parser calls for a block
 */

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const errorConfig = basicHelper.getErrorConfig(),
  InstanceComposer = OSTBase.InstanceComposer;

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

    oThis.transactionReceiptMap = {};
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
          transactionParser.perform().then(function(txParserResponse) {
            // If transaction parser was successful then only token transfer parser would work.
            if (txParserResponse.isSuccess()) {
              let transactionReceiptMap = txParserResponse.data.transactionReceiptMap || {},
                unprocessedItems = txParserResponse.data.unprocessedTransactions || [];

              if (unprocessedItems.length > 0) {
                logger.error('Transaction parser returned unprocessed items: ', unprocessedItems);
                return onReject(
                  responseHelper.error({
                    internal_error_identifier: 'l_b_dt_2',
                    api_error_identifier: 'something_went_wrong',
                    debug_options: 'Transaction parser returned unprocessed items.'
                  })
                );
              }
              // Merge all receipts in global map
              Object.assign(oThis.transactionReceiptMap, transactionReceiptMap);

              // Start with transfer parser as Transaction parser completed its work.
              new oThis.TokenTransferParser(
                oThis.chainId,
                oThis.rawCurrentBlock,
                transactionReceiptMap,
                oThis.nodesWithBlock
              )
                .perform()
                .then(function(ttpResp) {
                  if (ttpResp.isSuccess()) {
                    const injectionFailedTransactionHashes = ttpResp.data.injectionFailedTransactionHashes || [];

                    if (injectionFailedTransactionHashes.length > 0) {
                      logger.error(
                        'Token transfer parser returned injectionFailedTransactionHashes: ',
                        injectionFailedTransactionHashes
                      );
                      return onReject(ttpResp);
                    }
                    onResolve(ttpResp);
                  } else {
                    logger.error('Token Transfer Parser returns error: ', ttpResp.toHash());
                    onReject(ttpResp);
                  }
                })
                .catch(function(ttpErr) {
                  onReject(ttpErr);
                });
            } else {
              logger.error('Transaction Parser returns error: ', txParserResponse.toHash());
              onReject(txParserResponse);
            }
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

    return responseHelper.successWithData({transactionReceiptMap: oThis.transactionReceiptMap});
  }
}

InstanceComposer.registerAsShadowableClass(DistributeTransactions, coreConstants.icNameSpace, 'DistributeTransactions');
