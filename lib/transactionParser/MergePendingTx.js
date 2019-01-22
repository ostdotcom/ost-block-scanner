'use strict';
/**
 * This module merge the data from pending transactions into the transaction receipts.
 *
 * @module lib/transactionParser/MergePendingTx
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
require(rootPrefix + '/lib/models/sharded/byChainId/PendingTransaction');

/**
 *
 * Class to merge data from pending tx to tx receipt.
 *
 * @class
 */
class MergePendingTx {
  /**
   *
   * @param params
   * @param params.txHashToReceiptMap
   * @param params.chainId
   *
   * @constructor
   **/
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.txHashToReceiptMap = params.txHashToReceiptMap;
  }

  /**
   * Main performer method
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;
    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/transactionParser/MergePendingTx');
      return responseHelper.error({
        internal_error_identifier: 's_tp_mpt_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * This method merge the data coming from pending transactions table and input data.
   * It gives priority to input data. i.e transactionReceipts data.
   *
   * @returns {Promise<*|result>}
   */
  async asyncPerform() {
    const oThis = this,
      txHashToReceiptMap = oThis.txHashToReceiptMap,
      txHashes = Object.keys(txHashToReceiptMap),
      PendingTransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionModel'),
      pendingTransactionModel = new PendingTransactionModel({
        chainId: oThis.chainId
      }),
      finalMap = {};

    let pendingTransactionsRsp = await pendingTransactionModel.getPendingTransactionsWithHashes(
      oThis.chainId,
      txHashes
    );

    if (pendingTransactionsRsp.isFailure()) {
      return pendingTransactionsRsp;
    }

    let pendingTransactionsMap = pendingTransactionsRsp.data;

    let batchGetParams = [];
    for (let txHash in pendingTransactionsMap) {
      let txData = pendingTransactionsMap[txHash];
      batchGetParams.push(txData);
    }

    let pendingTransactionsData = {};
    if (batchGetParams.length > 0) {
      pendingTransactionsData = await pendingTransactionModel.getPendingTransactionData(batchGetParams);
    }

    for (let txHash in txHashToReceiptMap) {
      finalMap[txHash] = Object.assign({}, pendingTransactionsData[txHash], txHashToReceiptMap[txHash]);
    }

    return responseHelper.successWithData(finalMap);
  }
}

InstanceComposer.registerAsShadowableClass(MergePendingTx, coreConstants.icNameSpace, 'MergePendingTx');
