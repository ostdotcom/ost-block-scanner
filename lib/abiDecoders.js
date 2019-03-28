'use strict';
/**
 * File to decode the transfer event logs from the LogsArray provided
 *
 * @module lib/abiDecoders
 */
const rootPrefix = '..',
  parseEventAbi = require(rootPrefix + '/config/abi/parseEventAbi.json'),
  ruleExecutedEventAbi = require(rootPrefix + '/config/abi/ruleExecutedEventAbi.json'),
  abiDecoder = require('abi-decoder');

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

  /**
   * Initialize Abi Decoder with Parsable events Abi
   *
   */
  initParseEventAbi() {
    abiDecoder.addABI(parseEventAbi);
  }

  /**
   * Initialize Abi Decoder with Rule Executed events Abi
   *
   */
  initRuleExecutedEventAbi() {
    abiDecoder.addABI(ruleExecutedEventAbi);
  }
}

module.exports = AbiDecoders;
