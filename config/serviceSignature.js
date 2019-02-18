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
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'shardNumber',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },
  [serviceTypes.BlockParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: [
      { parameter: 'blockToProcess', validatorMethod: 'validateInteger' },
      { parameter: 'blockDelay', validatorMethod: 'validateInteger' }
    ]
  },

  [serviceTypes.TransactionParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'currentBlock',
        validatorMethod: 'validateObject'
      },
      {
        parameter: 'transactionHashes',
        validatorMethod: 'validateTransactionHashArray'
      },
      {
        parameter: 'nodesHavingBlock',
        validatorMethod: 'validateGethUrlsArray'
      }
    ],
    optional: []
  },

  [serviceTypes.TokenTransferParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'currentBlock',
        validatorMethod: 'validateObject'
      },
      {
        parameter: 'transactionReceipts',
        validatorMethod: 'validateTransactionReceiptsObject'
      },
      {
        parameter: 'nodesHavingBlock',
        validatorMethod: 'validateGethUrlsArray'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'blockNumbers',
        validatorMethod: 'validateIntegerArray'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockDetailsExtended]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'blockNumbers',
        validatorMethod: 'validateIntegerArray'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockTransactionHashes]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'blockNumber',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.TransactionDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'transactionHashes',
        validatorMethod: 'validateTransactionHashArray'
      }
    ],
    optional: [
      {
        parameter: 'transactionHashToShardIdentifierMap',
        validatorMethod: 'validateTransactionHashToShardIdentifierMap'
      },
      { parameter: 'consistentRead', validatorMethod: 'validateInteger' }
    ]
  },

  [serviceTypes.TransactionExtendedDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'transactionHashes',
        validatorMethod: 'validateTransactionHashArray'
      }
    ],
    optional: [
      {
        parameter: 'transactionHashToShardIdentifierMap',
        validatorMethod: 'validateTransactionHashToShardIdentifierMap'
      },
      { parameter: 'consistentRead', validatorMethod: 'validateInteger' }
    ]
  },

  [serviceTypes.TransferDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'transferIdentifiers',
        validatorMethod: 'validateTransferIdentifiers'
      }
    ],
    optional: [
      {
        parameter: 'transactionHashToShardIdentifierMap',
        validatorMethod: 'validateTransactionHashToShardIdentifierMap'
      },
      { parameter: 'consistentRead', validatorMethod: 'validateInteger' }
    ]
  },

  [serviceTypes.AllTransferDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'transactionHash',
        validatorMethod: 'validateTransactionHash'
      }
    ],
    optional: [
      {
        parameter: 'transactionHashToShardIdentifierMap',
        validatorMethod: 'validateTransactionHashToShardIdentifierMap'
      },
      { parameter: 'consistentRead', validatorMethod: 'validateInteger' }
    ]
  },

  [serviceTypes.ContractAddressDetails]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddresses',
        validatorMethod: 'validateAddressesArray'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressBalance]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddress',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'userAddresses',
        validatorMethod: 'validateAddressesArray'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressTransactionHashes]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddress',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'userAddress',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: [{ parameter: 'nextPagePayload', validatorMethod: 'validateNextPagePayload' }]
  },

  [serviceTypes.AddressTransfers]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddress',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'userAddress',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: [{ parameter: 'nextPagePayload', validatorMethod: 'validateNextPagePayload' }]
  },

  [serviceTypes.ChainBlocks]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.ChainTransactions]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.ReplaceShard]: {
    mandatory: [
      {
        parameter: 'shardType',
        validatorMethod: 'validateShardType'
      },
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'shardNumber',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.UpdateShard]: {
    mandatory: [
      {
        parameter: 'shardNumber',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'shardPrefix',
        validatorMethod: 'validateShardType'
      },
      {
        parameter: 'isAvailable',
        validatorMethod: 'validateBoolean'
      }
    ],
    optional: []
  },

  [serviceTypes.BlockChainIds]: {
    mandatory: [
      {
        parameter: 'blockNumber',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.AddressBasicDetails]: {
    mandatory: [
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.EconomyAggregator]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'blockNumber',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [serviceTypes.GetTokenHolders]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddress',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: [{ parameter: 'nextPagePayload', validatorMethod: 'validateNextPagePayload' }]
  },

  [serviceTypes.CreateEconomy]: {
    mandatory: [
      {
        parameter: 'chainId',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'contractAddress',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'simpleStakeAddress',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'decimals',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'provider',
        validatorMethod: 'validateGethUrl'
      },
      {
        parameter: 'blockTimestamp',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'displayName',
        validatorMethod: 'validateDisplayName'
      },
      {
        parameter: 'conversionFactor',
        validatorMethod: 'validateFloat'
      },
      {
        parameter: 'symbol',
        validatorMethod: 'validateString'
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
  getSignature() {
    return signature;
  }
}

module.exports = new ServiceSignature();
