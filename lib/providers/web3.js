'use strict';
/**
 * Web3 WS provider
 *
 * @module lib/providers/web3
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  web3Constants = require(rootPrefix + '/lib/globalConstant/web3Constants'),
  web3PoolFactory = OSTBase.OstWeb3Pool.Factory;

/**
 * Class for web3 interact
 *
 * @class
 */
class Web3Interact {
  /**
   * Web3 Interact constructor
   *
   * @param  {String} wsProvider: WS provider
   * @constructor
   */
  constructor(wsProvider) {
    const oThis = this;
    oThis.wsProvider = wsProvider;
  }

  /**
   * Returns the web3 WS provider
   *
   * @returns {*}
   */
  get web3WsProvider() {
    const oThis = this;
    return web3PoolFactory.getWeb3(oThis.wsProvider);
  }

  /**
   * Get transaction receipt of a given transaction hash
   *
   * @param  {String} transactionHash: Transaction Hash
   * @returns {Promise}
   */
  getReceipt(transactionHash) {
    const oThis = this;

    return oThis.web3WsProvider.eth.getTransactionReceipt(transactionHash);
  }

  /**
   * Get block details using a block number
   *
   * @param  {Integer} blockNumber: Block Number
   * @returns {Promise}
   */
  getBlock(blockNumber) {
    const oThis = this;

    return oThis.web3WsProvider.eth.getBlock(blockNumber, false);
  }

  /**
   * Get block number
   *
   * @returns {Promise}
   */
  getBlockNumber() {
    const oThis = this;

    return oThis.web3WsProvider.eth.getBlockNumber();
  }

  /**
   * Get transaction details using a transaction hash
   *
   * @param {String} transactionHash
   * @returns {Promise<>}
   */
  getTransaction(transactionHash) {
    const oThis = this;

    return oThis.web3WsProvider.eth.getTransaction(transactionHash);
  }
  /**
   * Get Contract Object using an abi and contract address
   *
   * @param {String} abi
   * @param {String} contractAddress
   * @returns {Object}
   */
  getContractObject(abi, contractAddress) {
    const oThis = this;

    return new oThis.web3WsProvider.eth.Contract(abi, contractAddress);
  }
}

/**
 * Provider for Web3Interact
 *
 * @class
 */
class Web3Provider {
  /**
   * Returns a web3 instance
   *
   * @param provider {String}: URL of the node
   *
   * @returns {Web3Interact}
   */
  getInstance(provider) {
    return new Web3Interact(provider);
  }
}

module.exports = new Web3Provider();
