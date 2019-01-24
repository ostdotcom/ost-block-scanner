'use strict';
/**
 * Common validators
 *
 * @module lib/validators/common
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic');

/**
 * Class for common validator.
 *
 * @class
 */
class CommonValidator {
  /**
   * Constructor for common validator.
   *
   * @constructor
   */
  constructor() {}

  /**
   * Is var null ?
   *
   * @param {Object/String/Number/Integer/Boolean} variable
   *
   * @returns {Boolean}
   */
  isVarNull(variable) {
    return typeof variable === 'undefined' || variable == null;
  }

  /**
   * Is var integer?
   *
   * @param {Number/String} variable
   *
   * @returns {Boolean}
   */
  validateInteger(variable) {
    const oThis = this;

    if (oThis.isVarNull(variable)) {
      return false;
    }

    if (typeof variable === 'number') {
      return variable % 1 === 0;
    } else {
      let number = Number(variable);
      if (isNaN(number)) {
        return false;
      } else {
        return oThis.validateInteger(number);
      }
    }
  }

  /**
   * Check if transaction hash is valid or not
   *
   * @param {Array} integerArray - integer array
   *
   * @return {Boolean}
   */
  validateIntegerArray(integerArray) {
    const oThis = this;

    if (Array.isArray(integerArray)) {
      for (let index = 0; index < integerArray.length; index++) {
        if (!oThis.validateInteger(integerArray[index])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Is string valid ?
   *
   * @param {String} variable
   *
   * @return {Boolean}
   */
  validateString(variable) {
    const oThis = this;

    return !oThis.isVarNull(variable) || typeof variable === 'string';
  }

  /**
   * Is object valid ?
   *
   * @param {Object} variable
   *
   * @return {Boolean}
   */
  validateObject(variable) {
    const oThis = this;

    return !oThis.isVarNull(variable) || typeof variable === 'object';
  }

  /**
   * Check if transaction hash is valid or not
   *
   * @param {String} transactionHash - Transaction hash
   *
   * @return {Boolean}
   */
  validateTransactionHash(transactionHash) {
    const oThis = this;

    if (!oThis.validateString(transactionHash)) {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(transactionHash);
  }

  /**
   * Check if transaction hash is valid or not
   *
   * @param {Array} transactionHashArray - Transaction hash array
   *
   * @return {Boolean}
   */
  validateTransactionHashArray(transactionHashArray) {
    const oThis = this;

    if (Array.isArray(transactionHashArray)) {
      for (let index = 0; index < transactionHashArray.length; index++) {
        if (!oThis.validateTransactionHash(transactionHashArray[index])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if the given string is an address
   *
   * @param {String} address: ETH address in HEX
   *
   * @returns {Boolean}
   */
  validateEthAddress(address) {
    const oThis = this;

    if (oThis.isVarNull(address) || !oThis.validateString(address) || address == '') {
      return false;
    }
    address = address.trim().toLowerCase();

    return /^(0x)?[0-9a-f]{40}$/i.test(address);
  }

  /**
   * Check if an address is valid or not
   *
   * @param {Array} addressesArray - addresses array
   *
   * @return {Boolean}
   */
  validateAddressesArray(addressesArray) {
    const oThis = this;

    if (Array.isArray(addressesArray)) {
      for (let index = 0; index < addressesArray.length; index++) {
        if (!oThis.validateEthAddress(addressesArray[index])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Validate shard identifier
   *
   * @param {String} shardIdentifier
   *
   * @return {Boolean}
   */
  validateShardIdentifier(shardIdentifier) {
    const oThis = this;

    if (!oThis.validateString(shardIdentifier)) {
      return false;
    }

    return /^[0-9_]*$/i.test(shardIdentifier);
  }

  /**
   * Check if transaction hash is valid or not
   *
   * @param {Object} transactionHashToShardIdentifierMap
   *
   * @return {Boolean}
   */
  validateTransactionHashToShardIdentifierMap(transactionHashToShardIdentifierMap) {
    const oThis = this;

    if (oThis.validateObject(transactionHashToShardIdentifierMap)) {
      for (let transactionHash in transactionHashToShardIdentifierMap) {
        if (
          !oThis.validateTransactionHash(transactionHash) ||
          !oThis.validateShardIdentifier(transactionHashToShardIdentifierMap[transactionHash])
        ) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Check if transaction hash is valid or not
   *
   * @param {Object} transferIdentifiers
   *
   * @return {Boolean}
   */
  validateTransferIdentifiers(transferIdentifiers) {
    const oThis = this;

    if (oThis.validateObject(transferIdentifiers)) {
      for (let transactionHash in transferIdentifiers) {
        if (
          !oThis.validateTransactionHash(transactionHash) ||
          !oThis.validateIntegerArray(transferIdentifiers[transactionHash])
        ) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Validate if nextPagePayload contains LastEvaluatedKey attribute
   *
   * @param {Object} nextPagePayload
   *
   * @return {Boolean}
   */
  validateNextPagePayload(nextPagePayload) {
    const oThis = this;

    if (oThis.validateObject(nextPagePayload)) {
      return nextPagePayload.hasOwnProperty(LastEvaluatedKey);
    } else {
      return false;
    }
  }

  /**
   * Is shardType valid?
   *
   * @param {String} shardType
   *
   * @return {Boolean}
   */
  validateShardType(shardType) {
    const oThis = this,
      shardTypeConstants = require(rootPrefix + '/lib/globalConstant/shardType'),
      validShardTypes = [
        shardTypeConstants.blockShard,
        shardTypeConstants.transactionShard,
        shardTypeConstants.economyAddressShard,
        shardTypeConstants.economyContractAddressShard
      ];

    if (oThis.validateString(shardType)) {
      return validShardTypes.includes(shardType);
    } else {
      return false;
    }
  }

  /**
   * Is valid Boolean?
   *
   * @param {Boolean} variable
   *
   * @return {Boolean}
   */
  validateBoolean(variable) {
    const oThis = this;

    if (oThis.isVarNull(variable)) {
      return false;
    }
    return variable === 'true' || variable === 'false' || variable === true || variable === false;
  }

  /**
   * Validate transactionReceiptsObject
   *
   * @param {Object} transactionReceiptsObject
   *
   * @return {Boolean}
   */
  validateTransactionReceiptsObject(transactionReceiptsObject) {
    const oThis = this;

    if (oThis.validateObject(transactionReceiptsObject)) {
      for (let transactionReceipt in transactionReceiptsObject) {
        if (!oThis.validateObject(transactionReceipt)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Is geth url valid?
   *
   * @param {String} url
   *
   * @return {Boolean}
   */
  validateGethUrl(url) {
    const oThis = this;
    // TODO: Tighten the regex.
    if (oThis.validateString(url)) {
      return /(.*):(\d*)\/?(.*)/gi.test(url);
    } else {
      return false;
    }
  }

  /**
   * Validate urlsArray
   *
   * @param {Array} urlsArray
   *
   * @return {Boolean}
   */
  validateGethUrlsArray(urlsArray) {
    const oThis = this;

    if (Array.isArray(urlsArray)) {
      for (let index = 0; index < urlsArray.length; index++) {
        if (!oThis.validateGethUrl(urlsArray[index])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Validate display name
   *
   * @param {String} name
   *
   * @return {Boolean}
   */
  validateDisplayName(name) {
    const oThis = this;

    if (!oThis.isVarNull(name) || !oThis.validateString(name)) {
      return false;
    }
    return /^[0-9a-zA-Z\s]*$/.test(name);
  }

  /**
   * Is var true?
   *
   * @param {Variable} variable
   *
   * @returns {Boolean}
   */
  isVarTrue(variable) {
    return variable === true || variable === 'true';
  }

  /**
   * Is var false?
   *
   * @param {Variable} variable
   *
   * @returns {Boolean}
   */
  isVarFalse(variable) {
    return variable === false || variable === 'false';
  }

  /**
   * Is valid Boolean?
   *
   * @param {Variable} variable
   *
   * @returns {Boolean}
   */
  isValidOrderingString(str) {
    return ['asc', 'desc'].includes(str.toLowerCase());
  }

  /**
   * Is valid UUID Array?
   *
   * @param {Array} array
   *
   * @returns {Boolean}
   */
  isValidUuidArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!basicHelper.isUuidValid(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }
}

module.exports = new CommonValidator();
