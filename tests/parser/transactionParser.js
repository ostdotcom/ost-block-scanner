const chai = require('chai'),
  assert = chai.assert;

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  config = require(rootPrefix + '/tests/data/config'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  InstanceComposer = OSTBase.InstanceComposer,
  instanceComposer = new InstanceComposer(config);

require(rootPrefix + '/services/contract/Get');
require(rootPrefix + '/services/transaction/Get');
require(rootPrefix + '/services/transaction/Parser');
require(rootPrefix + '/services/address/GetTransaction');
require(rootPrefix + '/services/transaction/GetExtended');
require(rootPrefix + '/services/chainInteractions/fetchERC20Contract');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');

const txpTestData = require(rootPrefix + '/tests/data/transactionParser');

describe('tests/parser/transactionParser', async function() {
  for (let index = 0; index < txpTestData.length; index++) {
    let txParserParameters = txpTestData[index],
      chainId = txParserParameters.chainId,
      rawCurrentBlock = txParserParameters.rawCurrentBlock,
      transactionHashes = txParserParameters.transactionHashes,
      nodesHavingBlock = txParserParameters.nodesHavingBlock;

    let TransactionModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetail'),
      transactionModelObj = new TransactionModel(chainId, transactionHashes),
      TransactionDetailModel = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'GetTransactionExtendedDetail'
      ),
      transactionDetailModelObj = new TransactionDetailModel(chainId, transactionHashes);

    it('It should make entry in transactions table.', async function() {
      let txHash = transactionHashes[0],
        web3Interact = await web3InteractFactory.getInstance(nodesHavingBlock[0]),
        getReceiptFromGeth = await web3Interact.getTransaction(txHash),
        response = await transactionModelObj.perform(transactionHashes);

      assert.equal(getReceiptFromGeth.blockNumber, response.data[txHash].blockNumber);
      if (getReceiptFromGeth.from) {
        assert.equal(getReceiptFromGeth.from.toLowerCase(), response.data[txHash].fromAddress);
      }
      if (getReceiptFromGeth.to) {
        assert.equal(getReceiptFromGeth.to.toLowerCase(), response.data[txHash].toAddress);
      }
    });

    it('It should make entry in transaction details table.', async function() {
      let resp = await transactionDetailModelObj.perform(transactionHashes);

      assert.equal(resp.isSuccess(), true);
    });

    it('It should make an entry in economies table if contract deployment is done.', async function() {
      let txHash = transactionHashes[0],
        web3Interact = await web3InteractFactory.getInstance(nodesHavingBlock[0]),
        getReceiptFromGeth = await web3Interact.getTransaction(txHash);

      if (getReceiptFromGeth.contractAddress && getReceiptFromGeth.contractAddress != '0x') {
        let FetchERC20Contract = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'FetchERC20Contract'),
          fetchERC20ContractObj = new FetchERC20Contract({
            contractAddress: getReceiptFromGeth.contractAddress,
            provider: nodesHavingBlock[0]
          });
        fetchERC20ContractObj.perform();

        let GetContractDetail = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetContractDetail'),
          GetContractDetailObj = new GetContractDetail(chainId, getReceiptFromGeth.contractAddress),
          contractDetails = GetContractDetailObj.asyncPerform();

        assert.equal(contractDetails.isSuccess(), true);
      }
    });

    it('It should make entry in shardByTransactions. ', async function() {
      let ShardIdentifierByTransactionCache = instanceComposer.getShadowedClassFor(
          coreConstants.icNameSpace,
          'ShardIdentifierByTransactionCache'
        ),
        params = {
          chainId: chainId,
          transactionHashes: transactionHashes
        },
        shardIdentifierByTransactionCacheObj = new ShardIdentifierByTransactionCache(params),
        shardByTxResponse = await shardIdentifierByTransactionCacheObj.fetchDataFromSource(params.transactionHashes);

      assert.equal(shardByTxResponse.isSuccess(), true);
    });

    it('It should make entry in shard by economy addresses. ', async function() {
      let economyContractAddress,
        txHash = transactionHashes[0],
        web3Interact = await web3InteractFactory.getInstance(nodesHavingBlock[0]),
        getReceiptFromGeth = await web3Interact.getTransaction(txHash),
        ShardIdentifierByEconomyAddressCache = instanceComposer.getShadowedClassFor(
          coreConstants.icNameSpace,
          'ShardIdentifierByEconomyAddressCache'
        );

      if (getReceiptFromGeth.contractAddress) {
        economyContractAddress = getReceiptFromGeth.contractAddress.toLowerCase();
      } else {
        economyContractAddress = '0x0';
      }

      if (getReceiptFromGeth.to) {
        let params = {
            chainId: chainId,
            economyContractAddress: economyContractAddress,
            addresses: [getReceiptFromGeth.to.toLowerCase()]
          },
          ShardIdentifierByEconomyAddressCacheObj = new ShardIdentifierByEconomyAddressCache(params),
          shardByEconomyAddResp = await ShardIdentifierByEconomyAddressCacheObj.fetchDataFromSource(params.addresses);
        assert.equal(shardByEconomyAddResp.isSuccess(), true);
      }
      if (getReceiptFromGeth.from) {
        let params = {
            chainId: chainId,
            economyContractAddress: economyContractAddress,
            addresses: [getReceiptFromGeth.from.toLowerCase()]
          },
          ShardIdentifierByEconomyAddressCacheObj = new ShardIdentifierByEconomyAddressCache(params),
          shardByEconomyAddResp = await ShardIdentifierByEconomyAddressCacheObj.fetchDataFromSource(params.addresses);
        assert.equal(shardByEconomyAddResp.isSuccess(), true);
      }
    });

    it('It should make entry in economy address transactions table. ', async function() {
      let economyContractAddress,
        txHash = transactionHashes[0],
        web3Interact = await web3InteractFactory.getInstance(nodesHavingBlock[0]),
        getReceiptFromGeth = await web3Interact.getTransaction(txHash),
        GetAddressTransaction = instanceComposer.getShadowedClassFor(
          coreConstants.icNameSpace,
          'GetAddressTransaction'
        );

      if (getReceiptFromGeth.contractAddress) {
        economyContractAddress = getReceiptFromGeth.contractAddress.toLowerCase();
      } else {
        economyContractAddress = '0x0';
      }

      if (getReceiptFromGeth.to) {
        let GetAddressTransactionObj = new GetAddressTransaction(
            chainId,
            getReceiptFromGeth.to.toLowerCase(),
            economyContractAddress
          ),
          addTransactionResp = await GetAddressTransactionObj.perform();
        assert.equal(addTransactionResp.isSuccess(), true);
      }

      if (getReceiptFromGeth.from) {
        let GetAddressTransactionObjFrom = new GetAddressTransaction(
            chainId,
            getReceiptFromGeth.from.toLowerCase(),
            economyContractAddress
          ),
          addTransactionRespFrom = await GetAddressTransactionObjFrom.perform();
        assert.equal(addTransactionRespFrom.isSuccess(), true);
      }
    });
  }
});
