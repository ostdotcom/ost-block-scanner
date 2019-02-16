'use strict';
/**
 * Index File for openst-block-scanner
 *
 * @module index
 */
const rootPrefix = '.',
  version = require(rootPrefix + '/package.json').version,
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer

// Models
require(rootPrefix + '/lib/models/shared/Chain');
require(rootPrefix + '/lib/models/shared/Shard');
require(rootPrefix + '/lib/models/shared/Economy');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');
require(rootPrefix + '/lib/models/shared/ShardByTransaction');
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransfer');
require(rootPrefix + '/lib/models/shared/ChainCronData');
require(rootPrefix + '/lib/models/sharded/byChainId/PendingTransaction');

// Model services
require(rootPrefix + '/services/AddChain');

// Shard
require(rootPrefix + '/services/shard/create/ByBlock');
require(rootPrefix + '/services/shard/create/ByChainId');
require(rootPrefix + '/services/shard/create/ByEconomyAddress');
require(rootPrefix + '/services/shard/create/ByTransaction');
require(rootPrefix + '/services/shard/Replace');

// Address
require(rootPrefix + '/services/address/GetBasicDetails');
require(rootPrefix + '/services/address/GetBalance');
require(rootPrefix + '/services/address/GetTransaction');
require(rootPrefix + '/services/address/GetTransfer');

// Block
require(rootPrefix + '/services/block/Get');
require(rootPrefix + '/services/block/GetExtended');
require(rootPrefix + '/services/block/GetChainIds');
require(rootPrefix + '/services/block/GetTransaction');
require(rootPrefix + '/services/block/Parser');
require(rootPrefix + '/services/block/Finalize');

// Chain
require(rootPrefix + '/services/chain/GetBlock');
require(rootPrefix + '/services/chain/GetTransaction');

// Contract
require(rootPrefix + '/services/contract/Get');

// Transaction
require(rootPrefix + '/services/transaction/Get');
require(rootPrefix + '/services/transaction/GetExtended');
require(rootPrefix + '/services/transaction/Parser');

// Transfer
require(rootPrefix + '/services/transfer/Get');
require(rootPrefix + '/services/transfer/GetAll');
require(rootPrefix + '/services/transfer/Parser');

//Cache
require(rootPrefix + '/lib/cacheMultiManagement/shared/Economy');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');
require(rootPrefix + '/lib/cacheManagement/chainSpecific/EconomyAddressTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByHash');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByUuid');

require(rootPrefix + '/services/economy/Create');
require(rootPrefix + '/services/economy/Aggregator');
require(rootPrefix + '/services/economy/GetTokenHolders');

class OpenSTBlockScanner {
  /**
   * Constructor for openst-block-scanner
   *
   * @param {Object} configStrategy
   * @constructor
   */
  constructor(configStrategy) {
    if (!configStrategy) {
      throw 'Mandatory argument configStrategy missing';
    }

    const oThis = this,
      instanceComposer = (oThis.ic = new InstanceComposer(configStrategy));

    oThis.version = version;

    const model = (oThis.model = {});
    // Add models here
    model.Chain = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ChainModel');
    model.Shard = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel');
    model.Economy = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'EconomyModel');
    model.ShardByBlock = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel');
    model.ShardByEconomyAddress = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'ShardByEconomyAddressModel'
    );
    model.ShardByTransaction = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'ShardByTransactionModel'
    );
    model.EconomyAddressTransferModel = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'EconomyAddressTransferModel'
    );
    model.ChainCronData = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ChainCronDataModel');
    model.PendingTransaction = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'PendingTransactionModel'
    );

    const service = (oThis.service = {});
    // Add services here
    service.addChain = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'AddChainService');

    // Create shards
    const shard = (oThis.shard = {});
    shard.shardByBlock = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockService');
    shard.shardByChainId = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByChainIdService');
    shard.shardByTransaction = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'ShardByTransactionService'
    );
    shard.shardByEconomyAddress = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'ShardByEconomyAddressService'
    );
    shard.Replace = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'Replace');

    // Address
    const address = (oThis.address = {});
    address.GetBasicDetails = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAddressBasicDetails');
    address.GetBalance = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAddressBalance');
    address.GetTransaction = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAddressTransaction');
    address.GetTransfer = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAddressTransfer');

    // Block
    const block = (oThis.block = {});
    block.Get = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetBlockDetail');
    block.GetChainIds = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetBlockChainIds');
    block.GetTransaction = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetBlockTransaction');
    block.GetExtended = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetBlockDetailExtended');
    block.Parser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser');
    block.Finalize = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'Finalize');

    // Chain
    const chain = (oThis.chain = {});
    chain.GetBlock = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetChainBlock');
    chain.GetTransaction = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetChainTransaction');

    // Contract
    const contract = (oThis.contract = {});
    contract.Get = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetContractDetail');

    // Transaction
    const transaction = (oThis.transaction = {});
    transaction.Get = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetail');
    transaction.GetExtended = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'GetTransactionExtendedDetail'
    );
    transaction.Parser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'TransactionParser');

    // Transfer
    const transfer = (oThis.transfer = {});
    transfer.Get = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransferDetail');
    transfer.GetAll = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAllTransferDetail');
    transfer.Parser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'TokenTransferParser');

    // Economy
    const economy = (oThis.economy = {});
    economy.Create = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'CreateEconomyService');
    economy.GetTokenHolders = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetTokenHolders');
    economy.Aggregator = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAggregator');

    const cache = (oThis.cache = {});
    // Add caches here
    // cache.TokenBalanceCache = TokenBalanceCache;
    cache.ShardIdentifierEconomyAddress = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'ShardIdentifierByEconomyAddressCache'
    );
    cache.EconomyAddressTransferCache = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'EconomyAddressTransferCache'
    );
    cache.Economy = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache');
    cache.PendingTransactionByHash = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'PendingTransactionByHashCache'
    );
    cache.PendingTransactionByUuid = instanceComposer.getShadowedClassFor(
      coreConstants.icNameSpace,
      'PendingTransactionByUuidCache'
    );
  }
}

module.exports = OpenSTBlockScanner;
