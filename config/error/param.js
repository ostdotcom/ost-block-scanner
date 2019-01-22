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
  missingShardNumber: {
    parameter: 'shardNumber',
    code: 'missing',
    message: 'Missing shard number'
  },
  missingNetworkId: {
    parameter: 'networkId',
    code: 'missing',
    message: 'Missing network id'
  },
  missingShardName: {
    parameter: 'missingShardName',
    code: 'missing',
    message: 'Missing shard name'
  },
  missingShardPrefix: {
    parameter: 'missingShardPrefix',
    code: 'missing',
    message: 'Missing shard prefix'
  },
  missingIsAvailable: {
    parameter: 'missingIsAvailable',
    code: 'missing',
    message: 'Missing shard availability parameter'
  },
  invalidShardName: {
    parameter: 'invalidShardName',
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
  },
  missingBlockToProcess: {
    parameter: 'blockToProcess',
    code: 'missing',
    message: 'Missing block to process'
  },
  missingBlockNumbers: {
    parameter: 'blockNumbers',
    code: 'missing',
    message: 'Missing block numbers'
  },
  missingBlockNumber: {
    parameter: 'blockNumber',
    code: 'missing',
    message: 'Missing block number'
  },
  missingTransactionHashes: {
    parameter: 'transactionHashes',
    code: 'missing',
    message: 'Missing transaction hashes'
  },
  missingTransactionHash: {
    parameter: 'transactionHash',
    code: 'missing',
    message: 'Missing transaction hash'
  },
  missingNodesHavingBlock: {
    parameter: 'nodesHavingBlock',
    code: 'missing',
    message: 'Missing nodes having block'
  },
  missingTransferIdentifiers: {
    parameter: 'transferIdentifiers',
    code: 'missing',
    message: 'Missing token transfer identifiers'
  },
  missingContractAddresses: {
    parameter: 'contractAddresses',
    code: 'missing',
    message: 'Missing contract addresses'
  },
  missingContractAddress: {
    parameter: 'contractAddress',
    code: 'missing',
    message: 'Missing contract address'
  },
  missingSimpleStakeAddress: {
    parameter: 'simpleStakeAddress',
    code: 'missing',
    message: 'Missing simpleStake address'
  },
  missingWeb3Provider: {
    parameter: 'web3Provider',
    code: 'missing',
    message: 'Missing web3Provider'
  },
  missingBlockTimestamp: {
    parameter: 'blockTimestamp',
    code: 'missing',
    message: 'Missing blockTimestamp'
  },
  missingDisplayName: {
    parameter: 'displayName',
    code: 'missing',
    message: 'Missing displayName'
  },
  missingConversionFactor: {
    parameter: 'conversionFactor',
    code: 'missing',
    message: 'Missing conversionFactor'
  },
  missingSymbol: {
    parameter: 'symbol',
    code: 'missing',
    message: 'Missing symbol'
  },
  missingDecimals: {
    parameter: 'decimals',
    code: 'missing',
    message: 'Missing decimals'
  },
  missingUserAddresses: {
    parameter: 'userAddresses',
    code: 'missing',
    message: 'Missing user addresses'
  },
  missingUserAddress: {
    parameter: 'userAddress',
    code: 'missing',
    message: 'Missing user address'
  },
  missingShardType: {
    parameter: 'shardType',
    code: 'missing',
    message: 'Missing shard type'
  }
};

module.exports = paramErrorConfig;
