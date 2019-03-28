'use strict';
/**
 * This module receives transactions data and format them as economy addresses transactions and transfers
 *
 * @module lib/economyAddresses/FormatTransactionsData
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

/**
 *  Class for add transactions service
 *
 * @class
 */
class FormatTransactionsData {
  /**
   * Create Data for addresses and transactions, as a map of economies
   *
   * @param {Object} transactionsDataMap: Map of transactions data to form data for economy address transactions
   *
   * @returns {Object} economyAddressTransactionsMap: Map of economy address transactions
   *
   */
  static formatAsEconomyAddressTransactions(transactionsDataMap) {
    let economyAddressTransactionsMap = {};

    // Loop on transaction receipts map and token transfers map
    for (let trHash in transactionsDataMap) {
      let trxData = transactionsDataMap[trHash];

      // Transaction from, to, contract address needs to be added in economy address transactions
      // As transaction needs to be shown on these address pages
      let contractAddr = '0x0';
      economyAddressTransactionsMap[contractAddr] = economyAddressTransactionsMap[contractAddr] || {};
      let ecoAddr = economyAddressTransactionsMap[contractAddr];
      let addressesToMap = [];
      let addr = trxData.from || trxData.fromAddress;
      if (!util.isEmptyAddress(addr)) {
        addressesToMap.push(addr.toLowerCase());
      }
      addr = trxData.to || trxData.toAddress;
      if (!util.isEmptyAddress(addr)) {
        addressesToMap.push(addr.toLowerCase());
      }
      if (!util.isEmptyAddress(trxData.contractAddress)) {
        addressesToMap.push(trxData.contractAddress.toLowerCase());
      }
      for (let j = 0; j < addressesToMap.length; j++) {
        let addr = addressesToMap[j];
        ecoAddr[addr] = ecoAddr[addr] || {};
        ecoAddr[addr][trHash] = ecoAddr[addr][trHash] || 0;
      }

      Object.assign(economyAddressTransactionsMap[contractAddr], ecoAddr);
    }

    return economyAddressTransactionsMap;
  }

  /**
   * Create Data for addresses and transactions, as a map of economies
   *
   * @param {Object} transfersDataMap: Map of token transfers data to form data for economy address transfers
   *
   * @returns {Object} economyAddressTransfersMap: Map of economy address transfers
   *
   */
  static formatAsEconomyAddressTransfers(transfersDataMap) {
    let economyAddressTransfersMap = {};

    // Loop on transaction receipts map and token transfers map
    for (let trHash in transfersDataMap) {
      let tokenTransfers = transfersDataMap[trHash] || [];

      for (let i = 0; i < tokenTransfers.length; i++) {
        let transfer = tokenTransfers[i];
        economyAddressTransfersMap[transfer.contractAddress] =
          economyAddressTransfersMap[transfer.contractAddress] || {};

        let ecoAddr = economyAddressTransfersMap[transfer.contractAddress];

        // Each address of a transfer event has to be added in economy.
        // Each address would be part of this transaction, so entry has to be made for that.
        let fromAddr = transfer.from || transfer.fromAddress,
          toAddr = transfer.to || transfer.toAddress,
          addressesToMap = [fromAddr, toAddr, transfer.contractAddress];
        for (let j = 0; j < addressesToMap.length; j++) {
          let addr = addressesToMap[j];
          // If its an empty address, no need to process it.
          if (util.isEmptyAddress(addr)) {
            continue;
          }
          ecoAddr[addr] = ecoAddr[addr] || {};
          ecoAddr[addr][trHash] = ecoAddr[addr][trHash] || [];
          if (!ecoAddr[addr][trHash].includes(transfer.eventIndex)) {
            ecoAddr[addr][trHash].push(transfer.eventIndex);
          }
        }

        Object.assign(economyAddressTransfersMap[transfer.contractAddress], ecoAddr);
      }
    }

    return economyAddressTransfersMap;
  }
}

module.exports = FormatTransactionsData;
