'use strict';
/**
 * Service Types
 *
 * @module lib/globalConstant/serviceTypes
 */

/**
 * Class for Service Types
 *
 * @class
 */
class ServiceTypes {
  /**
   * Constructor for Service Types
   *
   * @constructor
   */
  constructor() {}

  get CreateShards() {
    return 'CreateShards';
  }

  get BlockParser() {
    return 'BlockParser';
  }

  get BlockDetails() {
    return 'BlockDetails';
  }

  get BlockDetailsExtended() {
    return 'BlockDetailsExtended';
  }

  get TransactionDetails() {
    return 'TransactionDetails';
  }

  get TransactionExtendedDetails() {
    return 'TransactionExtendedDetails';
  }

  get TransferDetails() {
    return 'TransferDetails';
  }

  get AllTransferDetails() {
    return 'AllTransferDetails';
  }

  get ContractAddressDetails() {
    return 'ContractAddressDetails';
  }

  get BlockTransactionHashes() {
    return 'BlockTransactionHashes';
  }

  get CreateEconomy() {
    return 'CreateEconomy';
  }

  get AddressDetails() {
    return 'AddressDetails';
  }

  get AddressBalance() {
    return 'AddressBalance';
  }

  get AddressBasicDetails() {
    return 'AddressBasicDetails';
  }

  get AddressTransactionHashes() {
    return 'AddressTransactionHashes';
  }

  get AddressTransfers() {
    return 'AddressTransfers';
  }

  get ChainBlocks() {
    return 'ChainBlocks';
  }

  get ChainTransactions() {
    return 'ChainTransactions';
  }

  get TransactionParser() {
    return 'TransactionParser';
  }

  get TokenTransferParser() {
    return 'TokenTransferParser';
  }

  get ReplaceShard() {
    return 'ReplaceShard';
  }

  get UpdateShard() {
    return 'UpdateShard';
  }

  get BlockChainIds() {
    return 'BlockChainIds';
  }

  get EconomyAggregator() {
    return 'EconomyAggregator';
  }

  get GetTokenHolders() {
    return 'GetTokenHolders';
  }
}

module.exports = new ServiceTypes();
