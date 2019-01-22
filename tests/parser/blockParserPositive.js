const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chai = require('chai'),
  assert = chai.assert,
  config = require(rootPrefix + '/tests/data/config'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  InstanceComposer = OSTBase.InstanceComposer,
  instanceComposer = new InstanceComposer(config);

require(rootPrefix + '/services/block/Parser');
require(rootPrefix + '/lib/models/shared/ShardByBlock');
require(rootPrefix + '/lib/models/sharded/byBlock/Block');

let BlockParser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser'),
  ShardByBlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByBlockModel'),
  shardByBlockModel = new ShardByBlockModel({
    consistentRead: '0'
  }),
  BlockModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockModel');

let blockShardIdentifier = null,
  gethEndPoint = 'ws://127.0.0.1:19547',
  dynamoBlockInfo = {},
  chainBlockInfo = {};

describe('tests/parser/blockParserPositive.js', async function() {
  it('It should pass sanity', async function() {
    let blockParser = new BlockParser(1000, { blockToProcess: 130, blockDelay: 0 });

    let response = await blockParser.perform();
    let keyArray = Object.keys(response.data);

    assert(true, response.success);
    assert.deepEqual(keyArray.sort(), ['nextBlockToProcess', 'nodesWithBlock', 'rawCurrentBlock']);
  });

  it('It should return correct no. of transactions, block numbers', async function() {
    let blockParser = new BlockParser(1000, { blockToProcess: 78, blockDelay: 0 });

    let response = await blockParser.perform();
    let keyArray = Object.keys(response.data);

    assert(true, response.success);
    assert.deepEqual(keyArray.sort(), ['nextBlockToProcess', 'nodesWithBlock', 'rawCurrentBlock']);
    assert(gethEndPoint, response.data.nodesWithBlock[0]);
    assert(78, response.data.rawCurrentBlock.number);
    assert(79, response.data.nextBlockToProcess);
    assert(
      true,
      response.data.rawCurrentBlock.transactions.includes(
        '0x2fd68f226a1b51520e85b19476d4758d1c97e4201469e88692870d035d999b91'
      )
    );
    assert(1, response.data.rawCurrentBlock.transactions.length);
  });

  it('It should insert the data properly in shard by blocks table', async function() {
    let blockInfo = await shardByBlockModel.getBlock({
      chainId: 1000,
      blockNumber: 78
    });

    let row = blockInfo.data;

    assert(true, blockInfo.success);
    assert('78', row.blockNumber);
    assert('0x1b5f4d4496b356240c04fb6807bacc7aded346a48f6d50fd1a97581a810ca7f5', row.blockHash);
    assert('1000_1', row.shardIdentifier);

    blockShardIdentifier = row.shardIdentifier;
  });

  it('It should insert the data properly in block shard', async function() {
    let blockModel = new BlockModel({
      chainId: 1000,
      shardIdentifier: blockShardIdentifier
    });
    let blockInfo = await blockModel.getBlockDetails([78]);

    let row = blockInfo.data['78'],
      longNames = Object.keys(blockModel.longToShortNamesMap).sort(),
      rowKeys = Object.keys(row);

    dynamoBlockInfo = row;

    rowKeys.push('isFinal'); // This comes after verifier runs on this block
    rowKeys = rowKeys.sort();

    assert.deepEqual(longNames, rowKeys);
    assert('0x1b5f4d4496b356240c04fb6807bacc7aded346a48f6d50fd1a97581a810ca7f5', row.blockHash);
  });

  it('It should pass when block-delay is negative [default value is set to zero]', async function() {
    let blockDelay = -1,
      response = false;

    let blockParser = new BlockParser(1000, { blockToProcess: 131, blockDelay: blockDelay });

    try {
      response = await blockParser.perform();
      logger.log(response);
      assert.equal(response.isSuccess(), true);
    } catch (e) {
      assert.equal(response, true);
    }
  });

  it('It should pass when block-delay is undefined [default value is set to zero]', async function() {
    let blockDelay = undefined,
      response = false;

    let blockParser = new BlockParser(1000, { blockToProcess: 132, blockDelay: blockDelay });

    try {
      response = await blockParser.perform();
      logger.log(response);
      assert.equal(response.isSuccess(), true);
    } catch (e) {
      assert.equal(response, true);
    }
  });

  it('It should match with the data from chain for a block', async function() {
    let web3Interact = await web3InteractFactory.getInstance(gethEndPoint);

    chainBlockInfo = await web3Interact.getBlock(78);

    for (let key in dynamoBlockInfo) {
      if (chainBlockInfo.hasOwnProperty(key)) {
        assert(chainBlockInfo[key], dynamoBlockInfo[key]);
      } else {
        assert(chainBlockInfo.timestamp, dynamoBlockInfo.blockTimestamp);
        assert(chainBlockInfo.number, dynamoBlockInfo.blockNumber);
        assert(chainBlockInfo.hash, dynamoBlockInfo.blockHash);
        assert(chainBlockInfo.parentHash, dynamoBlockInfo.parentBlockHash);
        assert(chainBlockInfo.transactions.length, dynamoBlockInfo.totalTransactions);
        assert(1000, dynamoBlockInfo.chainId);
      }
    }
  });
});
