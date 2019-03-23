'use strict';
/**
 * Basic helper functions
 *
 * @module helpers/basic
 */
const BigNumber = require('bignumber.js');

const rootPrefix = '..',
  paramErrorConfig = require(rootPrefix + '/config/error/param'),
  generalErrorConfig = require(rootPrefix + '/config/error/general');

/**
 * Class for basic helper methods
 *
 * @class
 */
class BasicHelperKlass {
  /**
   * Constructor for basic helper methods
   *
   * @constructor
   */
  constructor() {}

  /**
   * Deep duplicate
   *
   * @param {Object} object: object to deep duplicate
   *
   * @returns {Object}: returns deep duplicated object
   */
  deepDup(object) {
    return JSON.parse(JSON.stringify(object));
  }

  /**
   * Invert
   *
   * @param {Object} object: object to invert
   *
   * @returns {Object}: returns the inverted object
   */
  invert(object) {
    let ret = {};

    for (let key in object) {
      ret[object[key]] = key;
    }

    return ret;
  }

  /**
   * Get error config
   *
   * @returns {Object}
   */
  getErrorConfig() {
    return {
      param_error_config: paramErrorConfig,
      api_error_config: generalErrorConfig
    };
  }

  /**
   * Converts number in wei to normal big number value
   *
   * @param {Number} numInWei
   *
   * @returns {BigNumber}
   */
  convertToNormal(numInWei) {
    return this.convertToBigNumber(numInWei).div(this.convertToBigNumber(10).toPower(18));
  }

  /**
   * Converts number in wei to normal big number value
   *
   * @param {Number} numInWei
   *
   * @returns {BigNumber}
   */
  convertToNormalForPower(numInWei, power) {
    return this.convertToBigNumber(numInWei).div(this.convertToBigNumber(10).toPower(power));
  }

  /**
   * Converts normal big number value to wei
   *
   * @param {Number} num
   *
   * @returns {BigNumber}
   */
  convertToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(18));
  }

  /**
   * Check if amount is valid wei number and not zero
   *
   * @param {Number/String} amountInWei: amount in wei
   *
   * @returns {Boolean}
   */
  isWeiValid(amountInWei) {
    const oneForMod = new BigNumber('1');

    // Convert amount in BigNumber
    let bigNumAmount = null;
    if (amountInWei instanceof BigNumber) {
      bigNumAmount = amountInWei;
    } else {
      let numAmount = Number(amountInWei);
      if (!isNaN(numAmount)) {
        bigNumAmount = new BigNumber(amountInWei);
      }
    }

    return !(
      !bigNumAmount ||
      bigNumAmount.lessThan(1) ||
      bigNumAmount.isNaN() ||
      !bigNumAmount.isFinite() ||
      bigNumAmount.mod(oneForMod) != 0
    );
  }

  /**
   * Convert wei to proper string. Make sure it's a valid number
   *
   * @param {Number} amountInWei - amount in wei to be formatted
   *
   * @returns {String}
   */
  formatWeiToString(amountInWei) {
    const oThis = this;

    return oThis.convertToBigNumber(amountInWei).toString(10);
  }

  /**
   * Convert number to big number. Make sure it's a valid number
   *
   * @param {Number} number: number to be formatted
   *
   * @returns {BigNumber}
   */
  convertToBigNumber(number) {
    return number instanceof BigNumber ? number : new BigNumber(number);
  }

  /**
   * Convert number to Hex
   *
   * @param {Number} number: number to be formatted
   *
   * @returns {String}
   */
  convertToHex(number) {
    return '0x' + new BigNumber(number).toString(16).toUpperCase();
  }

  /**
   * Check if address is valid or not
   *
   * @param {String} address: Address
   *
   * @returns {Boolean}
   */
  isAddressValid(address) {
    if (typeof address !== 'string') {
      return false;
    }

    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Check if uuid is valid or not
   *
   * @param {String} uuid: UUID of user, branded token etc.
   *
   * @returns {Boolean}
   */
  isUuidValid(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }

    return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/.test(uuid);
  }

  /**
   * Check if Token UUID is valid or not (hex format)
   *
   * @param {String} uuid: Branded Token UUID
   *
   * @returns {Boolean}
   */
  isTokenUuidValid(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }

    return /^0x[0-9a-fA-F]{64}$/.test(uuid);
  }

  /**
   * Check if eth address is valid or not
   *
   * @param {String} address: address
   *
   * @returns {Boolean}
   */
  isEthAddressValid(address) {
    if (typeof address !== 'string') {
      return false;
    }

    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Checks if transaction hash is valid or not
   *
   * @param {String} transactionHash: Transaction hash
   *
   * @returns {Boolean}
   */
  isTxHashValid(transactionHash) {
    if (typeof transactionHash !== 'string') {
      return false;
    }

    return /^0x[0-9a-fA-F]{64}$/.test(transactionHash);
  }

  /**
   * Checks if token name or symbol is valid or not
   *
   * @param {String} transactionHash: Transaction hash
   *
   * @returns {Boolean}
   */
  isTokenNameValid(tokenName) {
    if (typeof tokenName !== 'string') {
      return false;
    }

    return /^[a-zA-Z0-9_\s]*$/.test(tokenName);
  }

  /**
   * Is valid boolean?
   *
   * @param {String | Integer} str
   *
   * @returns {Boolean}
   */
  isValidBoolean(str) {
    const oThis = this;

    if (oThis.isVarNull(str)) {
      return false;
    }

    return str === 'true' || str === 'false' || str === true || str === false;
  }

  /**
   * Is var null?
   *
   * @param {String | Integer} variable
   *
   * @returns {Boolean}
   */
  isVarNull(variable) {
    return typeof variable === 'undefined' || variable === null;
  }

  /**
   * Is var true?
   *
   * @param {String | Integer} variable
   *
   * @returns {Boolean}
   */
  isVarTrue(variable) {
    return variable === true || variable === 'true';
  }

  /**
   * Is var false ?
   *
   * @param {String | Integer} variable
   *
   * @returns {Boolean}
   */
  isVarFalse(variable) {
    return variable === false || variable === 'false';
  }

  /**
   * Is var integer ?
   *
   * @param {String | Integer} variable
   *
   * @returns {Boolean}
   */
  isVarInteger(variable) {
    return typeof variable === 'number' && variable % 1 === 0;
  }

  /**
   * Is chain-id valid?
   *
   * @param {Integer} chainId
   *
   * @returns {Boolean}
   */
  isChainIdValid(chainId) {
    const oThis = this;

    return !oThis.isVarNull(chainId) || oThis.isVarInteger(chainId) || typeof chainId === 'string' || +chainId > 0;
  }

  /**
   * Is network-id valid?
   *
   * @param {Integer} networkId
   *
   * @returns {Boolean}
   */
  isNetworkIdValid(networkId) {
    const oThis = this;

    return (
      !oThis.isVarNull(networkId) || oThis.isVarInteger(networkId) || typeof networkId === 'string' || +networkId > 0
    );
  }

  /**
   * Is shard number valid?
   *
   * @param {Integer} shardNumber
   *
   * @returns {Boolean}
   */
  isShardNumberValid(shardNumber) {
    const oThis = this;

    return (
      !oThis.isVarNull(shardNumber) ||
      oThis.isVarInteger(shardNumber) ||
      typeof shardNumber === 'string' ||
      +shardNumber > 0
    );
  }

  /**
   * This function returns array of endpoints from nodeConfig array
   *
   * @param nodeConfig - config for connection endpoints
   *
   * @returns {Array}
   */
  getProvidersFromNode(nodeConfig) {
    let providers = [];

    for (let i = 0; i < nodeConfig.length; i++) {
      let node = nodeConfig[i];

      if (node.wsEndpoint && node.wsEndpoint !== '') {
        providers.push(node.wsEndpoint);
      } else if (node.rpcEndpoint && node.rpcEndpoint !== '') {
        providers.push(node.rpcEndpoint);
      }
    }

    return providers;
  }

  /**
   * Is transaction status success
   *
   * @param status
   * @returns {boolean}
   */
  isTransactionStatusSuccess(status) {
    return status == '0x1' || status;
  }

  /**
   * Is transaction status success
   *
   * @param status
   * @returns {boolean}
   */
  isTransactionStatusFailed(status) {
    return status == '0x0' || status == false;
  }

  /**
   * Get transaction status for DDB
   *
   * @param status
   * @returns {number}
   */
  getTransactionStatusForDB(status) {
    const oThis = this;

    if (oThis.isTransactionStatusSuccess(status)) {
      return 1;
    } else if (oThis.isTransactionStatusFailed(status)) {
      return 0;
    } else {
      // No other status should be set
      throw 'Transaction Status is not supported (' + status + ')';
    }
  }
}

module.exports = new BasicHelperKlass();
