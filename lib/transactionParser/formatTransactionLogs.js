'use strict';

/**
 * This module receives transaction receipts. It decodes event and then format data accordingly.
 *
 * @module lib/transactionParser/formatTransactionLogs
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
    oThis.transactionInternalStatus = true;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {*|result}
   */
  perform() {
    const oThis = this;

    let refreshEconomy = false;

    if (oThis.transactionReceipt && oThis.transactionReceipt.logs && oThis.transactionReceipt.logs.length) {
      let response = oThis.getLogsArrayToDecode(oThis.transactionReceipt.logs),
        logs = response.parsableEvents;

      refreshEconomy = response.refreshEconomy;

      if (logs.length) {
        let decodedEvents = new abiDecoderKlass().decodeLogs(logs);
        oThis._formatEventsData(decodedEvents);
      }
    }

    return responseHelper.successWithData({
      transactionInternalStatus: oThis.transactionInternalStatus,
      tokenTransfers: oThis.tokenTransfers,
      transactionTransferIndices: oThis.transactionTransferIndices,
      refreshEconomy: refreshEconomy
    });
  }

  /**
   * Check list of decodable events and refresh economy flag
   *
   * @param logs
   * @returns {{parsableEvents: Array, refreshEconomy: Boolean}}
   */
  getLogsArrayToDecode(logs) {
    const oThis = this;

    let logsWithEvents = [],
      parsableEventSignatures = eventConstants.getParsableSignatures(),
      refreshEconomyEventSignatures = eventConstants.getRefreshEconomySignatures(),
      refreshEconomy = false;

    for (let i = 0; i < logs.length; i++) {
      let txReceiptLogElement = logs[i];
      if (txReceiptLogElement.topics && txReceiptLogElement.topics.length) {
        let eventSignature = txReceiptLogElement.topics[0];
        if (parsableEventSignatures.includes(eventSignature)) {
          logsWithEvents.push(txReceiptLogElement);
        }

        if (refreshEconomyEventSignatures.includes(eventSignature)) {
          refreshEconomy = true;
        }
      }
    }

    return { parsableEvents: logsWithEvents, refreshEconomy: refreshEconomy };
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
        if (eventData && eventData.name) {
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
      case eventConstants.ruleExecutedEvent:
        oThis._processRuleExecutedEvent(eventData);
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

  /**
   * This method processes Rule executed events
   *
   * @param {Object} eventData
   * @private
   */
  _processRuleExecutedEvent(eventData) {
    const oThis = this;

    if (eventData && eventData.events && eventData.events.length > 0) {
      for (let j = 0; j < eventData.events.length; j++) {
        let eventVal = eventData.events[j];

        if (eventVal.name === '_status') {
          oThis.transactionInternalStatus = eventVal.value;
        }
      }
    }
  }
}

module.exports = FormatTransactionLogs;
