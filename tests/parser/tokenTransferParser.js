const chai = require('chai'),
  should = chai.should(),
  assert = chai.assert;

const rootPrefix = '../..',
  config = require(rootPrefix + '/tests/data/config'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  FormatTxLogs = require(rootPrefix + '/lib/transactionParser/formatTransactionLogs'),
  InstanceComposer = OSTBase.InstanceComposer,
  instanceComposer = new InstanceComposer(config);

require(rootPrefix + '/services/transaction/Get');
require(rootPrefix + '/services/address/GetTransfer');
require(rootPrefix + '/services/transfer/GetAll');

const ttpTestData = require(rootPrefix + '/tests/data/tokenTransferParser');

describe('tests/parser/tokenTransferParser', async function() {
  for (let index = 0; index < ttpTestData.length; index++) {
    let ttpParams = ttpTestData[index],
      chainId = ttpParams.chainId,
      txReceipt = ttpParams.transactionReceipts,
      txHashArray = [txReceipt.transactionHash],
      nodes = ttpParams.nodesHavingBlock;

    it('It should fetch transfer events. ', async function() {
      let formatTxLogs = new FormatTxLogs(txReceipt),
        formatTxLogsResp = formatTxLogs.perform(),
        keyArray = Object.keys(formatTxLogsResp.data);

      assert.equal(formatTxLogsResp.isSuccess(), true);
      assert.deepEqual(keyArray.sort(), ['tokenTransfers', 'transactionTransferIndices']);
    });

    it('It should make entry in transactions table for transfer events.', async function() {
      let TransactionModel = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetail'),
        transactionModelObj = new TransactionModel(chainId, txHashArray),
        response = await transactionModelObj.perform(txHashArray),
        resp = response.data[txReceipt.transactionHash];
      resp.should.have.property('totalTokenTransfers');
    });

    it('It should make entry in token transfers table.', async function() {
      let GetAllTransferDetail = instanceComposer.getShadowedClassFor(
          coreConstants.icNameSpace,
          'GetAllTransferDetail'
        ),
        getAllTransferDetailObj = new GetAllTransferDetail(chainId, txReceipt.transactionHash),
        response = await getAllTransferDetailObj.perform(),
        resp = response.data[txReceipt.transactionHash];

      resp.should.have.property('eventIndices');
      resp.should.have.property('transfers');
    });

    it('It should create an entry in economy address transfer table', async function() {
      let web3Interact = await web3InteractFactory.getInstance(nodes[0]),
        economyContractAddress,
        getReceiptFromGeth = await web3Interact.getTransaction(txReceipt.transactionHash),
        GetAddressTransfer = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'GetAddressTransfer');

      if (getReceiptFromGeth.contractAddress) {
        economyContractAddress = getReceiptFromGeth.contractAddress.toLowerCase();
      } else {
        economyContractAddress = '0x0';
      }
      if (getReceiptFromGeth.to) {
        let getAddressTransferObj = new GetAddressTransfer(
            chainId,
            getReceiptFromGeth.to.toLowerCase(),
            economyContractAddress
          ),
          getAddressTransferResp = await getAddressTransferObj.perform();
        assert.equal(getAddressTransferResp.isSuccess(), true);
      }

      if (getReceiptFromGeth.from) {
        let getAddressTransferObjFrom = new GetAddressTransfer(
            chainId,
            getReceiptFromGeth.from.toLowerCase(),
            economyContractAddress
          ),
          getAddressTransferRespFrom = await getAddressTransferObjFrom.perform();
        assert.equal(getAddressTransferRespFrom.isSuccess(), true);
      }
    });
  }
});
