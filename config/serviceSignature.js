'use strict';
/**
 * Load all the service signature constants.
 *
 * @module config/serviceSignature
 */
const rootPrefix = '..',
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const signature = {
  [serviceTypes.CreateShards]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'shardNumber',
        error_identifier: 'missingShardNumber'
      }
    ],
    optional: []
  },
  [serviceTypes.BlockParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: ['blockToProcess', 'blockDelay']
  },

  [serviceTypes.TransactionParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'currentBlock',
        error_identifier: 'missingBlockToProcess'
      },
      {
        parameter: 'transactionHashes',
        error_identifier: 'missingTransactionHashes'
      },
      {
        parameter: 'nodesHavingBlock',
        error_identifier: 'missingNodesHavingBlock'
      }
    ],
    optional: []
  },

  [serviceTypes.TokenTransferParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'currentBlock',
        error_identifier: 'missingBlockToProcess'
      },
      {
        parameter: 'transactionReceipts',
        error_identifier: 'missingTransactionReceipts'
      },
      {
        parameter: 'nodesHavingBlock',
        error_identifier: 'missingNodesHavingBlock'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'blockNumbers',
        error_identifier: 'missingBlockNumbers'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockDetailsExtended]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'blockNumbers',
        error_identifier: 'missingBlockNumbers'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockTransactionHashes]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'blockNumber',
        error_identifier: 'missingBlockNumber'
      }
    ],
    optional: []
  },

  [serviceTypes.TransactionDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'transactionHashes',
        error_identifier: 'missingTransactionHashes'
      }
    ],
    optional: ['transactionHashToShardIdentifierMap', 'consistentRead']
  },

  [serviceTypes.TransactionExtendedDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'transactionHashes',
        error_identifier: 'missingTransactionHashes'
      }
    ],
    optional: ['transactionHashToShardIdentifierMap', 'consistentRead']
  },

  [serviceTypes.TransferDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'transferIdentifiers',
        error_identifier: 'missingTransferIdentifiers'
      }
    ],
    optional: ['transactionHashToShardIdentifierMap', 'consistentRead']
  },

  [serviceTypes.AllTransferDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'transactionHash',
        error_identifier: 'missingTransactionHash'
      }
    ],
    optional: ['transactionHashToShardIdentifierMap', 'consistentRead']
  },

  [serviceTypes.ContractAddressDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddresses',
        error_identifier: 'missingContractAddresses'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressBalance]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddress',
        error_identifier: 'missingContractAddress'
      },
      {
        parameter: 'userAddresses',
        error_identifier: 'missingUserAddresses'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressTransactionHashes]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddress',
        error_identifier: 'missingContractAddress'
      },
      {
        parameter: 'userAddress',
        error_identifier: 'missingUserAddress'
      }
    ],
    optional: ['nextPagePayload']
  },

  [serviceTypes.AddressTransfers]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddress',
        error_identifier: 'missingContractAddress'
      },
      {
        parameter: 'userAddress',
        error_identifier: 'missingUserAddress'
      }
    ],
    optional: ['nextPagePayload']
  },

  [serviceTypes.ChainBlocks]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: []
  },

  [serviceTypes.ChainTransactions]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: []
  },

  [serviceTypes.ReplaceShard]: {
    mandatory: [
      {
        parameter: 'shardType',
        error_identifier: 'missingShardType'
      },
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'shardNumber',
        error_identifier: 'missingShardNumber'
      }
    ],
    optional: []
  },

  [serviceTypes.UpdateShard]: {
    mandatory: [
      {
        parameter: 'shardNumber',
        error_identifier: 'missingShardNumber'
      },
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'shardPrefix',
        error_identifier: 'missingShardPrefix'
      },
      {
        parameter: 'isAvailable',
        error_identifier: 'missingIsAvailable'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockChainIds]: {
    mandatory: [
      {
        parameter: 'blockNumber',
        error_identifier: 'missingBlockNumber'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressBasicDetails]: {
    mandatory: [
      {
        parameter: 'address',
        error_identifier: 'missingAddresses'
      },
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: []
  },

  [serviceTypes.EconomyAggregator]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'blockNumber',
        error_identifier: 'missingBlockNumber'
      }
    ],
    optional: []
  },

  [serviceTypes.GetTokenHolders]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddress',
        error_identifier: 'missingContractAddress'
      }
    ],
    optional: ['nextPagePayload']
  },

  [serviceTypes.CreateEconomy]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      },
      {
        parameter: 'contractAddress',
        error_identifier: 'missingContractAddress'
      },
      {
        parameter: 'simpleStakeAddress',
        error_identifier: 'missingSimpleStakeAddress'
      },
      {
        parameter: 'decimals',
        error_identifier: 'missingDecimals'
      },
      {
        parameter: 'provider',
        error_identifier: 'missingWeb3Provider'
      },
      {
        parameter: 'blockTimestamp',
        error_identifier: 'missingBlockTimestamp'
      },
      {
        parameter: 'displayName',
        error_identifier: 'missingDisplayName'
      },
      {
        parameter: 'conversionFactor',
        error_identifier: 'missingConversionFactor'
      },
      {
        parameter: 'symbol',
        error_identifier: 'missingSymbol'
      }
    ],
    optional: []
  }
};

/**
 * Class for service signature
 *
 * @class
 */
class ServiceSignature {
  /**
   * Constructor for service signature
   *
   * @constructor
   */
  constructor() {}

  getSignature() {
    return signature;
  }
}

module.exports = new ServiceSignature();
