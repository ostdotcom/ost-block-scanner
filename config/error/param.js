'use strict';
/**
 * This file has the error config for certain code validations.
 *
 * @module config/error/param
 */
const paramErrorConfig = {
  missingChainId: {
    parameter: 'chainId',
    code: 'missing',
    message: 'Missing chain id'
  },
  invalidChainId: {
    parameter: 'chainId',
    code: 'invalid',
    message: 'Invalid chain id'
  },
  missingShardNumber: {
    parameter: 'shardNumber',
    code: 'missing',
    message: 'Missing shard number'
  },
  invalidShardNumber: {
    parameter: 'shardNumber',
    code: 'invalid',
    message: 'Invalid shard number.'
  },
  missingBlockToProcess: {
    parameter: 'blockToProcess',
    code: 'missing',
    message: 'Missing block to process'
  },
  invalidBlockToProcess: {
    parameter: 'blockToProcess',
    code: 'invalid',
    message: 'Invalid block to process'
  },
  missingBlockDelay: {
    parameter: 'blockDelay',
    code: 'missing',
    message: 'Missing block delay'
  },
  invalidBlockDelay: {
    parameter: 'blockDelay',
    code: 'invalid',
    message: 'Invalid block delay'
  },
  missingCurrentBlock: {
    parameter: 'currentBlock',
    code: 'missing',
    message: 'Missing current block'
  },
  invalidCurrentBlock: {
    parameter: 'currentBlock',
    code: 'invalid',
    message: 'Invalid current block'
  },
  missingTransactionHashes: {
    parameter: 'transactionHashes',
    code: 'missing',
    message: 'Missing transaction hashes'
  },
  invalidTransactionHashes: {
    parameter: 'transactionHashes',
    code: 'invalid',
    message: 'Invalid transaction hashes'
  },
  missingNodesHavingBlock: {
    parameter: 'nodesHavingBlock',
    code: 'missing',
    message: 'Missing nodes having block'
  },
  invalidNodesHavingBlock: {
    parameter: 'nodesHavingBlock',
    code: 'invalid',
    message: 'Invalid nodes having block'
  },
  missingTransactionReceipts: {
    parameter: 'transactionReceipts',
    code: 'missing',
    message: 'Missing transaction receipts'
  },
  invalidTransactionReceipts: {
    parameter: 'transactionReceipts',
    code: 'invalid',
    message: 'Invalid transaction receipts'
  },
  missingBlockNumbers: {
    parameter: 'blockNumbers',
    code: 'missing',
    message: 'Missing block numbers'
  },
  invalidBlockNumbers: {
    parameter: 'blockNumbers',
    code: 'invalid',
    message: 'Invalid block numbers'
  },
  missingBlockNumber: {
    parameter: 'blockNumber',
    code: 'missing',
    message: 'Missing block number'
  },
  invalidBlockNumber: {
    parameter: 'blockNumber',
    code: 'invalid',
    message: 'Invalid block number'
  },
  missingTransactionHashToShardIdentifierMap: {
    parameter: 'transactionHashToShardIdentifierMap',
    code: 'missing',
    message: 'Missing transaction hash to shard-identifier map'
  },
  invalidTransactionHashToShardIdentifierMap: {
    parameter: 'transactionHashToShardIdentifierMap',
    code: 'invalid',
    message: 'Invalid transaction hash to shard-identifier map'
  },
  missingConsistentRead: {
    parameter: 'consistentRead',
    code: 'missing',
    message: 'Missing consistent read'
  },
  invalidConsistentRead: {
    parameter: 'consistentRead',
    code: 'invalid',
    message: 'Invalid consistent read'
  },
  missingTransferIdentifiers: {
    parameter: 'transferIdentifiers',
    code: 'missing',
    message: 'Missing token transfer identifiers'
  },
  invalidTransferIdentifiers: {
    parameter: 'transferIdentifiers',
    code: 'invalid',
    message: 'Invalid token transfer identifiers'
  },
  missingContractAddresses: {
    parameter: 'contractAddresses',
    code: 'missing',
    message: 'Missing contract addresses'
  },
  invalidContractAddresses: {
    parameter: 'contractAddresses',
    code: 'invalid',
    message: 'Invalid contract addresses'
  },
  missingContractAddress: {
    parameter: 'contractAddress',
    code: 'missing',
    message: 'Missing contract address'
  },
  invalidContractAddress: {
    parameter: 'contractAddress',
    code: 'invalid',
    message: 'Invalid contract address'
  },
  missingUserAddresses: {
    parameter: 'userAddresses',
    code: 'missing',
    message: 'Missing user addresses'
  },
  invalidUserAddresses: {
    parameter: 'userAddresses',
    code: 'invalid',
    message: 'Invalid user addresses'
  },
  missingUserAddress: {
    parameter: 'userAddress',
    code: 'missing',
    message: 'Missing user address'
  },
  invalidUserAddress: {
    parameter: 'userAddress',
    code: 'invalid',
    message: 'Invalid user address'
  },
  missingNextPagePayload: {
    parameter: 'nextPagePayload',
    code: 'missing',
    message: 'Missing next page payload'
  },
  invalidNextPagePayload: {
    parameter: 'nextPagePayload',
    code: 'invalid',
    message: 'Invalid next page payload'
  },
  missingShardType: {
    parameter: 'shardType',
    code: 'missing',
    message: 'Missing shard type'
  },
  invalidShardType: {
    parameter: 'shardType',
    code: 'invalid',
    message: 'Invalid shard type'
  },
  missingShardPrefix: {
    parameter: 'shardPrefix',
    code: 'missing',
    message: 'Missing shard prefix'
  },
  invalidShardPrefix: {
    parameter: 'shardPrefix',
    code: 'invalid',
    message: 'Invalid shard prefix'
  },
  missingIsAvailable: {
    parameter: 'isAvailable',
    code: 'missing',
    message: 'Missing shard availability parameter'
  },
  invalidIsAvailable: {
    parameter: 'isAvailable',
    code: 'invalid',
    message: 'Invalid shard availability parameter'
  },
  missingAddress: {
    parameter: 'address',
    code: 'missing',
    message: 'Missing address'
  },
  invalidAddress: {
    parameter: 'address',
    code: 'invalid',
    message: 'Invalid address'
  },
  missingGatewayContractAddress: {
    parameter: 'gatewayContractAddress',
    code: 'missing',
    message: 'Missing gatewayContract address'
  },
  invalidGatewayContractAddress: {
    parameter: 'gatewayContractAddress',
    code: 'invalid',
    message: 'Invalid gatewayContract address'
  },
  missingDecimals: {
    parameter: 'decimals',
    code: 'missing',
    message: 'Missing decimals'
  },
  invalidDecimals: {
    parameter: 'decimals',
    code: 'invalid',
    message: 'Invalid decimals'
  },
  missingProvider: {
    parameter: 'provider',
    code: 'missing',
    message: 'Missing web3Provider'
  },
  invalidProvider: {
    parameter: 'provider',
    code: 'invalid',
    message: 'Invalid web3Provider'
  },
  missingBlockTimestamp: {
    parameter: 'blockTimestamp',
    code: 'missing',
    message: 'Missing blockTimestamp'
  },
  invalidBlockTimestamp: {
    parameter: 'blockTimestamp',
    code: 'invalid',
    message: 'Invalid blockTimestamp'
  },
  missingDisplayName: {
    parameter: 'displayName',
    code: 'missing',
    message: 'Missing displayName'
  },
  invalidDisplayName: {
    parameter: 'displayName',
    code: 'invalid',
    message: 'Invalid displayName'
  },
  missingConversionFactor: {
    parameter: 'conversionFactor',
    code: 'missing',
    message: 'Missing conversionFactor'
  },
  invalidConversionFactor: {
    parameter: 'conversionFactor',
    code: 'invalid',
    message: 'Invalid conversionFactor'
  },
  missingSymbol: {
    parameter: 'symbol',
    code: 'missing',
    message: 'Missing symbol'
  },
  invalidSymbol: {
    parameter: 'symbol',
    code: 'invalid',
    message: 'Invalid symbol'
  },
  missingNetworkId: {
    parameter: 'networkId',
    code: 'missing',
    message: 'Missing network id'
  },
  invalidNetworkId: {
    parameter: 'networkId',
    code: 'invalid',
    message: 'Invalid network id'
  },
  missingBlockShardCount: {
    parameter: 'blockShardCount',
    code: 'missing',
    message: 'Missing block shard count'
  },
  invalidBlockShardCount: {
    parameter: 'blockShardCount',
    code: 'invalid',
    message: 'Invalid block shard count'
  },
  missingEconomyShardCount: {
    parameter: 'economyShardCount',
    code: 'missing',
    message: 'Missing economy shard count'
  },
  invalidEconomyShardCount: {
    parameter: 'economyShardCount',
    code: 'invalid',
    message: 'Invalid economy shard count'
  },
  missingEconomyAddressShardCount: {
    parameter: 'economyAddressShardCount',
    code: 'missing',
    message: 'Missing economy address shard count'
  },
  invalidEconomyAddressShardCount: {
    parameter: 'economyAddressShardCount',
    code: 'invalid',
    message: 'Invalid economy address shard count'
  },
  missingTransactionShardCount: {
    parameter: 'transactionShardCount',
    code: 'missing',
    message: 'Missing transaction shard count'
  },
  invalidTransactionShardCount: {
    parameter: 'transactionShardCount',
    code: 'invalid',
    message: 'Invalid transaction shard count'
  },
  missingTransactionHash: {
    parameter: 'transactionHash',
    code: 'missing',
    message: 'Missing transaction hash'
  },
  invalidTransactionHash: {
    parameter: 'transactionHash',
    code: 'invalid',
    message: 'Invalid transaction hash'
  },
  missingShardName: {
    parameter: 'shardName',
    code: 'missing',
    message: 'Missing shard name'
  },
  invalidShardName: {
    parameter: 'shardName',
    code: 'invalid',
    message: 'Invalid shard name'
  },
  ddbRequestFailed: {
    parameter: 'ddbRequestFailed',
    code: 'failure',
    message: 'Ddb request failed'
  },
  invalidServiceType: {
    parameter: 'invalidServiceType',
    code: 'invalid',
    message: 'Invalid service type'
  }
};

module.exports = paramErrorConfig;
