'use strict';
/**
 * File to decode the transfer event logs from the LogsArray provided
 *
 * @module lib/abiDecoders
 */
const rootPrefix = '..',
  parseEventAbi = require(rootPrefix + '/config/abi/parseEventAbi.json'),
  abiDecoder = require('abi-decoder');

// Initialize decoder with abi.
abiDecoder.addABI(parseEventAbi);

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
