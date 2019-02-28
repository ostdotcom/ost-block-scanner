'use strict';
/**
 * This module merge the data from pending transactions into the transaction receipts.
 *
 * @module lib/transactionParser/MergePendingTx
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byChainId/PendingTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByHash');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByUuid');

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
      PendingTransactionByHashCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionByHashCache'),
      PendingTransactionByUuidCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionByUuidCache'),
      finalMap = {};

    if (txHashes.length === 0) {
      return responseHelper.successWithData(finalMap);
    }

    let pendingTransactionsRsp = await new PendingTransactionByHashCache({
      chainId: oThis.chainId,
      transactionHashes: txHashes
    }).fetch();

    if (pendingTransactionsRsp.isFailure()) {
      return pendingTransactionsRsp;
    }

    let pendingTransactionsMap = pendingTransactionsRsp.data;

    let transactionUuids = [];
    for (let txHash in pendingTransactionsMap) {
      let txData = pendingTransactionsMap[txHash];
      if (txData && txData.transactionUuid) {
        transactionUuids.push(txData.transactionUuid);
      }
    }

    if (transactionUuids.length === 0) {
      return responseHelper.successWithData(txHashToReceiptMap);
    }

    let pendingTransactionCache = new PendingTransactionByUuidCache({
        chainId: oThis.chainId,
        transactionUuids: transactionUuids
      }),
      pendingTransactionsData = await pendingTransactionCache.fetch();

    for (let txHash in txHashToReceiptMap) {
      let txReceipt = txHashToReceiptMap[txHash],
        pendingTxData = pendingTransactionsMap[txHash],
        pendingTxDataToMerge = {};

      if (pendingTxData) {
        pendingTxDataToMerge = pendingTransactionsData.data[pendingTxData.transactionUuid];
      }

      finalMap[txHash] = Object.assign({}, pendingTxDataToMerge, txReceipt);
    }

    return responseHelper.successWithData(finalMap);
  }
}

InstanceComposer.registerAsShadowableClass(MergePendingTx, coreConstants.icNameSpace, 'MergePendingTx');
