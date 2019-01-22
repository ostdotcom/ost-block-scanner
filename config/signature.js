'use strict';
/**
 * Load all the signature constants.
 *
 * @module config/signature
 */
const rootPrefix = '..',
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const signature = {
  [signatureConstants.CreateShards]: {
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
  [signatureConstants.BlockParser]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: ['blockToProcess', 'blockDelay']
  },

  [signatureConstants.TransactionParser]: {
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

  [signatureConstants.TokenTransferParser]: {
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

  [signatureConstants.BlockDetails]: {
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

  [signatureConstants.BlockDetailsExtended]: {
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

  [signatureConstants.BlockTransactionHashes]: {
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

  [signatureConstants.TransactionDetails]: {
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

  [signatureConstants.TransactionExtendedDetails]: {
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

  [signatureConstants.TransferDetails]: {
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

  [signatureConstants.AllTransferDetails]: {
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

  [signatureConstants.ContractAddressDetails]: {
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

  [signatureConstants.AddressBalance]: {
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

  [signatureConstants.AddressTransactionHashes]: {
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

  [signatureConstants.AddressTransfers]: {
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

  [signatureConstants.ChainBlocks]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: []
  },

  [signatureConstants.ChainTransactions]: {
    mandatory: [
      {
        parameter: 'chainId',
        error_identifier: 'missingChainId'
      }
    ],
    optional: []
  },

  [signatureConstants.ReplaceShard]: {
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

  [signatureConstants.UpdateShard]: {
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

  [signatureConstants.BlockChainIds]: {
    mandatory: [
      {
        parameter: 'blockNumber',
        error_identifier: 'missingBlockNumber'
      }
    ],
    optional: []
  },

  [signatureConstants.AddressBasicDetails]: {
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

  [signatureConstants.EconomyAggregator]: {
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

  [signatureConstants.GetTokenHolders]: {
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

  [signatureConstants.CreateEconomy]: {
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
 * Class for signature config
 *
 * @class
 */
class Signature {
  /**
   * Constructor for signature config
   *
   * @constructor
   */
  constructor() {}

  getSignature() {
    return signature;
  }
}

module.exports = new Signature();
