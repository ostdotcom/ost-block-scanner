'use strict';

/**
 * This service receives transaction receipts. It decodes event and then format data accordingly.
 *
 * @module services/transactionsParser/formatTransactionLogs
 */
const rootPrefix = '../..',
  abiDecoderKlass = require(rootPrefix + '/lib/abiDecoders'),
  eventConstants = require(rootPrefix + '/config/eventConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for formatting transaction logs
 *
 * @class
 */
class FormatTransactionLogs {
  /**
   * Constructor for formatting transaction logs
   *
   * @param {Object} transactionReceipt: Transaction Receipt fetched from Chain.
   * @constructor
   */
  constructor(transactionReceipt) {
    const oThis = this;

    oThis.transactionReceipt = transactionReceipt;
    oThis.tokenTransfers = [];
    oThis.tokenTransferIndex = 0;
    oThis.transactionTransferIndices = [];
    oThis.knownEvents = [];
  }

  /**
   * Main performer method for the class.
   *
   * @returns {*|result}
   */
  perform() {
    const oThis = this;

    if (oThis.transactionReceipt && oThis.transactionReceipt.logs && oThis.transactionReceipt.logs.length) {
      let logs = oThis.getLogsArrayToDecode(oThis.transactionReceipt.logs);
      if (logs.length) {
        let decodedEvents = new abiDecoderKlass().decodeLogs(logs);
        oThis._formatEventsData(decodedEvents);
      }

      oThis._getKnownEventsInLogs(oThis.transactionReceipt.logs);
    }

    return responseHelper.successWithData({
      tokenTransfers: oThis.tokenTransfers,
      transactionTransferIndices: oThis.transactionTransferIndices,
      knownEvents: oThis.knownEvents
    });
  }

  /**
   * Get name of known events.
   *
   * @param logs
   * @returns {Array}
   * @private
   */
  _getKnownEventsInLogs(logs) {
    const oThis = this;
    let knownEventsToNamesMap = eventConstants.eventSignatureToName(),
      knownSignatures = eventConstants.getAllSignatures();

    for (let i = 0; i < logs.length; i++) {
      let txReceiptLogElement = logs[i];
      if (txReceiptLogElement.topics && txReceiptLogElement.topics.length) {
        let eventSignature = txReceiptLogElement.topics[0].toString();
        if (knownSignatures.includes(eventSignature)) {
          oThis.knownEvents.push(knownEventsToNamesMap[eventSignature]);
        }
      }
    }
    // To remove duplicate events.
    oThis.knownEvents = [...new Set(oThis.knownEvents)];
  }

  /**
   * Check if event need to be decoded or not
   *
   * @param logs
   *
   * @returns {Array}
   */
  getLogsArrayToDecode(logs) {
    const oThis = this;
    let logsWithEvents = [];
    for (let i = 0; i < logs.length; i++) {
      let txReceiptLogElement = logs[i];
      if (txReceiptLogElement.topics && txReceiptLogElement.topics.length) {
        let eventSignature = txReceiptLogElement.topics[0];
        if (oThis._eventsParsingRequired(eventSignature)) {
          logsWithEvents.push(txReceiptLogElement);
        }
      }
    }
    return logsWithEvents;
  }

  /**
   * This method would determine whether events parsing would be done in this transaction or not.
   *
   * @returns {Number}
   * @private
   */
  _eventsParsingRequired(eventSignature) {
    let eventSignatures = eventConstants.getParsableSignatures();

    return eventSignatures.includes(eventSignature) ? 1 : 0;
  }

  /**
   * This method formats the events data
   *
   * @param {Array} decodedEvents
   * @private
   */
  _formatEventsData(decodedEvents) {
    const oThis = this;

    if (decodedEvents && decodedEvents.length > 0) {
      for (let i = 0; i < decodedEvents.length; i++) {
        let eventData = decodedEvents[i];
        if (eventData && Object.keys(eventData).includes('name')) {
          oThis._processEvent(eventData);
        }
      }
    }
  }

  /**
   * This method processes the eventData
   *
   * @param {Object} eventData
   * @private
   */
  _processEvent(eventData) {
    const oThis = this;

    switch (eventData.name.toLowerCase()) {
      case eventConstants.transferEvent:
        oThis._processTransfer(eventData);
        break;
    }
  }

  /**
   * This method processes transfer events
   *
   * @param {Object} eventData
   * @private
   */
  _processTransfer(eventData) {
    const oThis = this;
    oThis.tokenTransferIndex += 1;

    if (eventData && eventData.events && eventData.events.length > 0) {
      let transferEvent = {};
      transferEvent['contractAddress'] = eventData.address.toLowerCase() || '';
      transferEvent['eventIndex'] = oThis.tokenTransferIndex;
      oThis.transactionTransferIndices.push(oThis.tokenTransferIndex);
      for (let j = 0; j < eventData.events.length; j++) {
        let eventVal = eventData.events[j];

        if (eventVal.name === '_from') {
          transferEvent['from'] = eventVal.value.toLowerCase();
        }
        if (eventVal.name === '_to') {
          transferEvent['to'] = eventVal.value.toLowerCase();
        }
        if (eventVal.name === '_value') {
          transferEvent['amount'] = eventVal.value;
        }
      }
      oThis.tokenTransfers.push(transferEvent);
    }
  }
}

module.exports = FormatTransactionLogs;
