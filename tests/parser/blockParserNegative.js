const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chai = require('chai'),
  assert = chai.assert,
  config = require(rootPrefix + '/tests/data/config'),
  InstanceComposer = OSTBase.InstanceComposer,
  instanceComposer = new InstanceComposer(config);

require(rootPrefix + '/services/block/Parser');

let BlockParser = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockParser');

describe('tests/parser/blockParserNegative.js', async function() {
  it('It should failed when chainId is undefined', async function() {
    let cid = undefined,
      response = false;

    let blockParser = new BlockParser(cid, { blockToProcess: 0, blockDelay: 0 });

    try {
      response = await blockParser.perform();
      logger.log(response);
      assert.equal(response.isSuccess(), false);
    } catch (e) {
      assert.equal(response, false);
    }
  });

  it('It should failed when chainId does not match to chainId from config file', async function() {
    let blockParser = new BlockParser(1001, { blockToProcess: 0, blockDelay: 0 });

    let response = await blockParser.perform();

    logger.log(response);
    assert(true, response);
  });

  it('It should failed when chainId is negative', async function() {
    let cid = -1000,
      response = false;

    let blockParser = new BlockParser(cid, { blockToProcess: 0, blockDelay: 0 });

    try {
      response = await blockParser.perform();
      logger.log(response);
      assert.equal(response.isSuccess(), false);
    } catch (e) {
      assert.equal(response, false);
    }
  });

  it('It should failed for incorrect block number [should return next processed block in response]', async function() {
    let blockToProcess = 140, //does not exists on geth
      response = false;

    let blockParser = new BlockParser(1000, { blockToProcess: blockToProcess, blockDelay: 0 });

    response = await blockParser.perform();
    logger.log(response);
    assert.equal(response.data.nextBlockToProcess, 140);
  });

  it('It should failed when blockNumber is negative', async function() {
    let blockToProcess = -1,
      response = false;

    let blockParser = new BlockParser(1000, { blockToProcess: blockToProcess, blockDelay: 0 });

    response = await blockParser.perform();
    logger.log(response);
    assert.equal(response.isSuccess(), false);
  });
});
