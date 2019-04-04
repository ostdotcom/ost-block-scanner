'use strict';

/*
 * This module receives block data and delete all transactions data of a block from db.
 *
 * @module lib/block/RevertBlockTransactionsData
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/Transaction');
require(rootPrefix + '/lib/models/sharded/byTransaction/TransactionDetail');
require(rootPrefix + '/lib/block/FetchTransactions');
require(rootPrefix + '/lib/economyAddresses/WriteEconomyAddressTransactions');
require(rootPrefix + '/lib/economyAddresses/WriteEconomyAddressTransfers');

class RevertBlockTransactionsData {
  /**
   * constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.rawBlockData = params.rawBlockData;
  }

  /**
   * perform
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/block/RevertBlockTransactionsData.js');
      return responseHelper.error({
        internal_error_identifier: 'l_f_rb_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * asyncPerform
   *
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.getTransactionData();

    await oThis.cleanupEconomyAddressTransactions();

    await oThis.cleanupEconomyAddressTransfers();

    await oThis.cleanupTokenTransfers();

    await oThis.cleanupTransactionsAndShards();

    return responseHelper.successWithData();
  }

  /**
   * getTransactionData
   *
   * @return {Promise<*>}
   */
  async getTransactionData() {
    const oThis = this,
      FetchBlockTransactions = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'FetchBlockTransactions');

    let fetchBlockTransactions = new FetchBlockTransactions(
      oThis.chainId,
      oThis.rawBlockData.number,
      oThis.rawBlockData.timestamp,
      true
    );

    let response = await fetchBlockTransactions.perform();

    if (response.isFailure()) {
      return response;
    }

    oThis.transactionData = response.data.transactionsData;
    oThis.tokenTransfers = response.data.tokenTransfers;
    oThis.shardTransactionsMap = response.data.shardTransactionsMap;
  }

  /**
   * cleanupTransactions
   *
   * @return {Promise<void>}
   */
  async cleanupTransactionsAndShards() {
    const oThis = this,
      TransactionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionModel'),
      TransactionDetailModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailModel'),
      ShardByTransaction = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTransactionModel'),
      shardByTransaction = new ShardByTransaction({});

    logger.info('Deleting Transactions of block: ', oThis.rawBlockData.number);

    let shardTransactionsToDelete = [];
    for (let shardId in oThis.shardTransactionsMap) {
      let transactionHashes = oThis.shardTransactionsMap[shardId],
        dataToDelete = [];

      let transactionModel = new TransactionModel({
        shardIdentifier: shardId,
        chainId: oThis.chainId
      });
      let transactionDetailModel = new TransactionDetailModel({
        shardIdentifier: shardId,
        chainId: oThis.chainId
      });

      for (let i = 0; i < transactionHashes.length; i++) {
        let keyData = {
          chainId: oThis.chainId.toString(),
          transactionHash: transactionHashes[i]
        };

        dataToDelete.push(keyData);
        shardTransactionsToDelete.push(keyData);
      }

      if (dataToDelete.length > 0) {
        await transactionModel.batchDeleteItem(dataToDelete);
        await transactionDetailModel.batchDeleteItem(dataToDelete);
      }
    }

    // Delete shard by transactions
    if (shardTransactionsToDelete.length > 0) {
      await shardByTransaction.batchDeleteItem(shardTransactionsToDelete);
    }
  }

  /**
   * cleanupTokenTransfers
   *
   * @return {Promise<void>}
   */
  async cleanupTokenTransfers() {
    const oThis = this,
      TokenTransferModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferModel');

    logger.info('Deleting Token Transfers of block: ', oThis.rawBlockData.number);
    for (let shardId in oThis.shardTransactionsMap) {
      let transactionHashes = oThis.shardTransactionsMap[shardId],
        dataToDelete = [];

      let tokenTransferModel = new TokenTransferModel({
        shardIdentifier: shardId,
        chainId: oThis.chainId
      });
      for (let txInd = 0; txInd < transactionHashes.length; txInd++) {
        let transfers = oThis.tokenTransfers[transactionHashes[txInd]] || [];

        for (let tsfInd = 0; tsfInd < transfers.length; tsfInd++) {
          let keyData = {
            transactionHash: transactionHashes[txInd],
            eventIndex: transfers[tsfInd].eventIndex
          };

          dataToDelete.push(keyData);
        }
      }

      if (dataToDelete.length > 0) {
        await tokenTransferModel.batchDeleteItem(dataToDelete);
      }
    }
  }

  /**
   * cleanupEconomyAddressTransactions
   */
  async cleanupEconomyAddressTransactions() {
    const oThis = this,
      WriteEconomyAddressTransactions = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'WriteEconomyAddressTransactions'),
      writeEconomyAddressTransactions = new WriteEconomyAddressTransactions({
        transactionReceiptMap: oThis.transactionData,
        chainId: oThis.chainId,
        blockNumber: oThis.rawBlockData.number,
        deleteMode: true
      });

    logger.info('Deleting Economy Address Transactions of block: ', oThis.rawBlockData.number);

    return writeEconomyAddressTransactions.perform();
  }

  /**
   * cleanupEconomyAddressTransfers
   */
  async cleanupEconomyAddressTransfers() {
    const oThis = this,
      WriteEconomyAddressTransfers = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'WriteEconomyAddressTransfers'),
      writeEconomyAddressTransfers = new WriteEconomyAddressTransfers({
        transactionReceiptMap: oThis.transactionData,
        tokenTransfersMap: oThis.tokenTransfers,
        chainId: oThis.chainId,
        blockNumber: oThis.rawBlockData.number,
        deleteMode: true
      });

    logger.info('Deleting Economy Address Transfers of block: ', oThis.rawBlockData.number);

    return writeEconomyAddressTransfers.perform();
  }
}

InstanceComposer.registerAsShadowableClass(
  RevertBlockTransactionsData,
  coreConstants.icNameSpace,
  'RevertBlockTransactionsData'
);
