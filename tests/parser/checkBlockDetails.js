const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chai = require('chai'),
  assert = chai.assert,
  config = require(rootPrefix + '/tests/data/config'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  InstanceComposer = OSTBase.InstanceComposer,
  instanceComposer = new InstanceComposer(config);

require(rootPrefix + '/services/block/Parser');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/sharded/byBlock/Block');

let BlockParser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser'),
  ShardByBlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
  BlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel'),
  shardByBlockModel = new ShardByBlockModel({
    consistentRead: '0'
  });

let blockShardIdentifier = null,
  gethEndPoint = 'ws://127.0.0.1:19547',
  chainId = 1000,
  highestBlockFromService = 0,
  chainBlockInfo = {};

describe('tests/parser/checkBlockDetails.js', async function() {
  for (let i = 0; i <= 5; i++) {
    it('It should pass when data from table matches to chain data for a block', async function() {
      let blockParser = new BlockParser(chainId, { blockToProcess: i, blockDelay: 0 });

      let response = await blockParser.perform();

      highestBlockFromService = response.data.rawCurrentBlock.number;

      let keyArray = Object.keys(response.data),
        transactionHashes = response.data.rawCurrentBlock.transactions;

      assert(true, response.success);
      assert.deepEqual(keyArray.sort(), ['nextBlockToProcess', 'nodesWithBlock', 'rawCurrentBlock']);

      let blockInfo = await shardByBlockModel.getBlock({
        chainId: chainId,
        blockNumber: i
      });

      let row = blockInfo.data,
        blockShardIdentifier = row.shardIdentifier;

      let blockModel = new BlockModel({
        chainId: chainId,
        shardIdentifier: blockShardIdentifier
      });

      let dynamoBlockInfo = await blockModel.getBlockDetails([i]),
        web3Interact = await web3Provider.getInstance(gethEndPoint);

      dynamoBlockInfo = dynamoBlockInfo.data[i];
      chainBlockInfo = await web3Interact.getBlock(i);

      assert.deepEqual(chainBlockInfo.transactions.sort(), transactionHashes.sort());

      for (let key in dynamoBlockInfo) {
        if (chainBlockInfo.hasOwnProperty(key)) {
          assert.equal(chainBlockInfo[key], dynamoBlockInfo[key]);
        } else {
          assert.equal(chainBlockInfo.timestamp, dynamoBlockInfo.blockTimestamp);
          assert.equal(chainBlockInfo.number, dynamoBlockInfo.blockNumber);
          assert(chainBlockInfo.hash, dynamoBlockInfo.blockHash);
          assert(chainBlockInfo.parentHash, dynamoBlockInfo.parentBlockHash);
          assert.equal(chainBlockInfo.transactions.length, parseInt(dynamoBlockInfo.totalTransactions));
          assert(chainId, dynamoBlockInfo.chainId);
        }
      }
    });
  }

  it('It should passed when highest block entry in table is same as highest block from geth', async function() {
    let shardByBlockModelRsp = await shardByBlockModel.getHighestBlock(chainId),
      highestBlockFromTable = shardByBlockModelRsp.data['highestBlock'];

    logger.log('highestBlockFromTable', highestBlockFromTable);
    logger.log('highestBlockFromService', highestBlockFromService);

    assert.equal(highestBlockFromService, highestBlockFromTable);
  });
});
