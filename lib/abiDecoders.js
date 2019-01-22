'use strict';
/**
 * File to decode the transfer event logs from the LogsArray provided
 *
 * @module lib/abiDecoders
 */
const rootPrefix = '..',
  coreAbi = require(rootPrefix + '/config/genericData/coreAbis.json'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  abiDecoder = require('abi-decoder');

// Initialize decoder with abi.
abiDecoder.addABI(coreAbi);

class AbiDecoders {
  /**
   * Decode event logs from the LogsArray provided
   *
   * @param  {Array} logsArray: logs array of the transactions receipt
   * @returns {Hash}: Hash of all the events in the log
   */
  decodeLogs(logsArray) {
    return abiDecoder.decodeLogs(logsArray);
  }
}

module.exports = AbiDecoders;
