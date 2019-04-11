'use strict';
/**
 * This service fetches tx receipts and tx details from DB for given array of transaction hashes from provided chain.
 * It also merges these two information into one consolidated hash.
 *
 * @module services/chainInteractions/fetchTransactions
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3');

const errorConfig = basicHelper.getErrorConfig();

const TXS_PER_BATCH = 20;

/**
 * Class for fetch transactions service
 *
 * @class
 */
class FetchTransactions {
  /**
   * Constructor for fetch transactions
   *
   * @param {Array} providers: array of node urls
   * @param {Array} transactionHashes: array of transaction hashes
   *
   * @constructor
   */
  constructor(providers, transactionHashes) {
    const oThis = this;

    oThis.providers = providers;
    oThis.transactionHashes = transactionHashes;

    oThis.txHashToTxReceiptMap = {};
    oThis.txHashToTxDetailsMap = {};
    oThis.txHashToTxFinalInfoMap = {};
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/chainInteractions/fetchTransactionReceipts');
      return responseHelper.error({
        internal_error_identifier: 's_ci_ftr_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this,
      startTime = Date.now();
    logger.debug('FetchTransactions: ');
    //this function creates two maps -> txReceipts and txDetails
    await oThis._getTransactionDetails();

    logger.debug('FetchTransactions Done: BatchSize: ', oThis.transactionHashes.length, Date.now() - startTime);
    //this function merges two maps and returns tx details
    return oThis._mergeTransactionDetails();
  }

  /**
   * Get transaction receipt for given transaction hashes.
   *
   * @returns {Promise}
   *
   * @private
   */
  async _getTransactionDetails() {
    const oThis = this;

    let batchNo = 1,
      promiseArray = [];

    while (true) {
      const offset = (batchNo - 1) * TXS_PER_BATCH,
        batchedTxHashes = oThis.transactionHashes.slice(offset, TXS_PER_BATCH + offset);

      if (batchedTxHashes.length === 0) break;

      promiseArray.push(oThis._getTxReceiptsForBatch(batchedTxHashes, batchNo));
      // As there is no need of geth-(getTransaction) currently.
      promiseArray.push(oThis._getTxInfoForBatch(batchedTxHashes, batchNo));

      batchNo = batchNo + 1;
    }

    await Promise.all(promiseArray);

    return Promise.resolve();
  }

  /**
   * Returns transaction receipts for given batch of transaction hashes
   *
   * @param {Array} batchedTxHashes: one batch of transaction hashes
   * @param {Number} batchNo: current batch number to decide the provider endpoint from providers array

   * @returns {Promise<>}
   *
   * @private
   */
  async _getTxReceiptsForBatch(batchedTxHashes, batchNo) {
    const oThis = this;

    // receipt for one batch are to be fetched from one provider. Next batch from next provider.
    let provider_ind = batchNo % oThis.providers.length,
      provider = oThis.providers[provider_ind];

    logger.debug(`TxReceiptsForBatch: Batch No :${batchNo} with Provider: ${provider}`);

    let getTxReceiptsResponse = await oThis._getTxReceipts(batchedTxHashes, provider);

    if (getTxReceiptsResponse.isSuccess()) {
      Object.assign(oThis.txHashToTxReceiptMap, getTxReceiptsResponse.data.transactionReceipts);
      // If there are transactions whose receipts are not found, then look on other providers.
      if (getTxReceiptsResponse.data.receiptNotFoundCount > 0) {
        for (let i = 0; i < oThis.providers.length; i++) {
          let newProvider = oThis.providers[i];
          if (newProvider == provider) continue;
          logger.debug(`TxReceiptsForBatch: Batch No :${batchNo} with Provider: ${newProvider}`);
          let rsp = await oThis._getTxReceipts(batchedTxHashes, newProvider);
          if (rsp.isSuccess()) {
            Object.assign(oThis.txHashToTxReceiptMap, rsp.data.transactionReceipts);
            // As all the receipts of batch are found then no need to check on other providers.
            if (rsp.data.receiptNotFoundCount === 0) {
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Fetches transaction receipts.
   *
   * @param batchedTxHashes - one batch of transaction hashes
   * @param provider - provider endpoint
   *
   * @return {Promise<>}
   *
   * @private
   */
  async _getTxReceipts(batchedTxHashes, provider) {
    const oThis = this;

    let txHashToReceiptsMap = {};

    return new Promise(function(onResolve, onReject) {
      const totalCount = batchedTxHashes.length;

      let count = 0,
        receiptNotFoundCount = 0;

      const requestCallback = function(err, result) {
        if (err) {
          onReject();
        }

        count++;
        if (result) {
          result.transactionHash = result.transactionHash.toLowerCase();
          result.from = result.from ? result.from.toLowerCase() : '';
          result.to = result.to ? result.to.toLowerCase() : '';
          result.contractAddress = result.contractAddress ? result.contractAddress.toLowerCase() : '';
          txHashToReceiptsMap[result.transactionHash] = result;
        } else {
          receiptNotFoundCount++;
        }

        if (count === totalCount) {
          onResolve(
            responseHelper.successWithData({
              transactionReceipts: txHashToReceiptsMap,
              receiptNotFoundCount: receiptNotFoundCount
            })
          );
        }
      };

      let web3Interact = web3InteractFactory.getInstance(provider),
        batch = new web3Interact.web3WsProvider.BatchRequest();

      for (let i = 0; i < batchedTxHashes.length; i++) {
        let transactionHash = batchedTxHashes[i];

        let getTransactionReceiptRequest = web3Interact.web3WsProvider.eth.getTransactionReceipt.request(
          transactionHash,
          requestCallback
        );

        batch.add(getTransactionReceiptRequest);
      }

      batch.execute();
    });
  }

  /**
   * Returns transaction details for given batch of transaction hashes
   *
   * @param {Array} batchedTxHashes: one batch of transaction hashes
   * @param {Number} batchNo: current batch number to decide the provider endpoint from providers array
   * @returns {Promise<>}
   * @private
   */
  async _getTxInfoForBatch(batchedTxHashes, batchNo) {
    const oThis = this;

    logger.debug(`TxInfoForBatch: Batch No :${batchNo}`);

    return new Promise(function(onResolve, onReject) {
      const totalCount = batchedTxHashes.length;

      let count = 0,
        provider_ind = batchNo % oThis.providers.length,
        provider = oThis.providers[provider_ind];

      const requestCallback = function(err, result) {
        if (err) {
          onReject();
        }

        count++;
        if (result) {
          result.hash = result.hash.toLowerCase();
          result.from = result.from ? result.from.toLowerCase() : '';
          result.to = result.to ? result.to.toLowerCase() : '';
          result.contractAddress = result.contractAddress ? result.contractAddress.toLowerCase() : '';
          oThis.txHashToTxDetailsMap[result.hash] = result;
        }

        if (count === totalCount) {
          onResolve();
        }
      };

      let web3Interact = web3InteractFactory.getInstance(provider),
        batch = new web3Interact.web3WsProvider.BatchRequest();

      for (let i = 0; i < batchedTxHashes.length; i++) {
        let transactionHash = batchedTxHashes[i];

        let getTransactionRequest = web3Interact.web3WsProvider.eth.getTransaction.request(
          transactionHash,
          requestCallback
        );

        batch.add(getTransactionRequest);
      }

      batch.execute();
    });
  }

  /**
   * This function merges two maps(txReceipts and txDetails) to form one map containing final tx info.
   *
   * @returns {Promise<any>}
   * @private
   */
  _mergeTransactionDetails() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let txHash = oThis.transactionHashes[i],
        txReceipt = oThis.txHashToTxReceiptMap[txHash] || {},
        txDetails = oThis.txHashToTxDetailsMap[txHash] || {};

      // If transaction details or transaction receipts from chain is not fetched
      // OR block hash of transaction is not same in both calls then don't send out that data.
      if (!txDetails || !txReceipt || txDetails.blockHash.toLowerCase() != txReceipt.blockHash.toLowerCase()) {
        continue;
      }

      oThis.txHashToTxFinalInfoMap[txHash] = Object.assign({}, txDetails, txReceipt);
    }

    logger.win('* Merging Tx Receipts DONE');

    return Promise.resolve(responseHelper.successWithData(oThis.txHashToTxFinalInfoMap));
  }
}

module.exports = FetchTransactions;
