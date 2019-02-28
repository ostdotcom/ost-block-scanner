'use strict';
/**
 * This module receives transaction receipts and create entries in economy address transactions
 *
 * @module lib/economyAddresses/WriteEconomyAddressTransfers
 */
const rootPrefix = '../..',
  WriteBaseKlass = require(rootPrefix + '/lib/economyAddresses/WriteBase'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  formatTransactionsData = require(rootPrefix + '/lib/economyAddresses/FormatTransactionsData'),
  util = require(rootPrefix + '/lib/util');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransfer');

/**
 *  Class for add transactions service
 *
 * @class
 */
class WriteEconomyAddressTransfers extends WriteBaseKlass {
  /**
   *
   * @param params
   * @param params.transactionReceiptMap: Map of transaction receipts to insert - {trx_hash => {trx_receipt}}
   * @param params.tokenTransfersMap: Map of token transfer events to insert - {trx_hash => [transfer_event]}
   * @param params.chainId: Chain Id of transactions
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.tokenTransfersMap = params.tokenTransfersMap || {};
  }

  /**
   * Create Data for addresses and transfers, as a map of economies
   *
   */
  _formatAddressesData() {
    const oThis = this;

    oThis.economyAddressTransactionsMap = formatTransactionsData.formatAsEconomyAddressTransfers(
      oThis.tokenTransfersMap
    );
  }

  /**
   * Create Economy address transaction data to insert as batchWrite
   *
   */
  _formatDataAsItemsToInsert() {
    const oThis = this;

    // Loop on union data to form an array of rows to insert
    for (let economyAddr in oThis.economyAddressTransactionsMap) {
      let economyIdentifier = oThis.chainId + '-' + economyAddr;

      if (oThis.economyAddressTransactionsMap[economyAddr]) {
        // Loop on addresses of an economy
        for (let userAddr in oThis.economyAddressTransactionsMap[economyAddr]) {
          if (!oThis.economyAddressShards[economyAddr] || !oThis.economyAddressShards[economyAddr][userAddr]) {
            oThis.shardsNotFound[economyAddr] = oThis.shardsNotFound[economyAddr] || [];
            oThis.shardsNotFound[economyAddr].push(userAddr);
            continue;
          }

          let addrShard = oThis.economyAddressShards[economyAddr][userAddr],
            transactionsHashes = Object.keys(oThis.economyAddressTransactionsMap[economyAddr][userAddr]);

          // Loop on transactions and transfer events inside it.
          for (let i = 0; i < transactionsHashes.length; i++) {
            let trHash = transactionsHashes[i],
              trxReceipt = oThis.transactionReceiptMap[trHash],
              transferEventIndices = oThis.economyAddressTransactionsMap[economyAddr][userAddr][trHash];

            for (let j = 0; j < transferEventIndices.length; j++) {
              let eventIndex = transferEventIndices[j];
              oThis.addressTrxsInsertData[addrShard] = oThis.addressTrxsInsertData[addrShard] || [];
              oThis.addressTrxsInsertData[addrShard].push({
                addressIdentifier: userAddr + '-' + economyIdentifier,
                transactionHash: trHash,
                paginationTimestamp: util.generatePaginationTimestamp(
                  trxReceipt.blockTimestamp,
                  trxReceipt.transactionIndex,
                  eventIndex
                )
              });
            }
          }
        }
      }
    }
  }

  /**
   * Get Economy address model object to insert data
   *
   */
  _getModelToInsertData(shardId) {
    const oThis = this;

    let modelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransferModel'),
      addrTrxModelObj = new modelKlass({ chainId: oThis.chainId, shardIdentifier: shardId });

    return addrTrxModelObj;
  }
}

InstanceComposer.registerAsShadowableClass(
  WriteEconomyAddressTransfers,
  coreConstants.icNameSpace,
  'WriteEconomyAddressTransfers'
);
