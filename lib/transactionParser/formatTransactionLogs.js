'use strict';

/**
 * This service receives transaction receipts. It decodes event and then format data accordingly.
 *
 * @module services/transactionsParser/formatTransactionLogs
 */
const rootPrefix = '../..',
  abiDecoderKlass = require(rootPrefix + '/lib/abiDecoders'),
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
  }

  get transferEventSignature() {
    return '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  }

  get processedMintEventSignature() {
    return '0x96989a6b1d8c3bb8d6cc22e14b188b5c14b1f33f34ff07ea2e4fd6d880dac2c7';
  }

  get revertedMintEventSignature() {
    return '0x86e6b95641fbf0f8939eb3da2e7e26aee0188048353d08a45c78218e84cf1d4f';
  }

  /**
   * Returns an array of all event signatures.
   *
   * @returns {Array}
   */
  getAllSignatures() {
    const oThis = this;
    let signaturesArray = [];
    signaturesArray.push(oThis.transferEventSignature);
    signaturesArray.push(oThis.processedMintEventSignature);
    signaturesArray.push(oThis.revertedMintEventSignature);

    return signaturesArray;
  }

  /**
   * This method would determine whether events parsing would be done in this transaction or not.
   *
   * @returns {Number}
   * @private
   */
  _eventsParsingRequired(eventSignature) {
    const oThis = this,
      eventSignatures = oThis.getAllSignatures();

    return eventSignatures.includes(eventSignature) ? 1 : 0;
  }

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
    }

    return responseHelper.successWithData({
      tokenTransfers: oThis.tokenTransfers,
      transactionTransferIndices: oThis.transactionTransferIndices
    });
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
      case 'transfer':
        oThis._processTransfer(eventData);
        break;
      case 'revertedmint':
        oThis._processRevertedMint(eventData);
        break;
      case 'burn':
        oThis._processRevertedMint(eventData);
        break;
      case 'processedmint':
        oThis._processProcessedMint(eventData);
        break;
      case 'mint':
        oThis._processProcessedMint(eventData);
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
      transferEvent['refreshEconomyDetails'] = 0;
      oThis.tokenTransfers.push(transferEvent);
    }
  }

  /**
   * This method creates processedMint event.
   *
   * @param {Object} eventData
   * @private
   */
  _processProcessedMint(eventData) {
    const oThis = this;

    oThis.tokenTransferIndex += 1;

    // creating a dummy token transfer event
    if (eventData && eventData.events && eventData.events.length > 0) {
      let transferEvent = {};
      transferEvent['eventIndex'] = oThis.tokenTransferIndex;
      oThis.transactionTransferIndices.push(oThis.tokenTransferIndex);
      for (let j = 0; j < eventData.events.length; j++) {
        let eventVal = eventData.events[j];

        if (eventVal.name === '_token') {
          transferEvent['contractAddress'] = eventVal.value.toLowerCase();
        }
        if (eventVal.name === '_beneficiary') {
          transferEvent['to'] = eventVal.value.toLowerCase();
          transferEvent['from'] = '0x0000000000000000000000000000000000000000';
        }
        if (eventVal.name === '_amount') {
          transferEvent['amount'] = eventVal.value;
        }
      }

      transferEvent['refreshEconomyDetails'] = 1;
      oThis.tokenTransfers.push(transferEvent);
    }
  }

  _processRevertedMint(eventData) {
    const oThis = this;

    oThis.tokenTransferIndex += 1;

    // creating a dummy token transfer event
    if (eventData && eventData.events && eventData.events.length > 0) {
      let transferEvent = {};
      transferEvent['eventIndex'] = oThis.tokenTransferIndex;
      oThis.transactionTransferIndices.push(oThis.tokenTransferIndex);
      for (let j = 0; j < eventData.events.length; j++) {
        let eventVal = eventData.events[j];

        if (eventVal.name === '_token') {
          transferEvent['contractAddress'] = eventVal.value.toLowerCase();
        }
        if (eventVal.name === '_beneficiary') {
          transferEvent['to'] = '0x0000000000000000000000000000000000000000';
          transferEvent['from'] = eventVal.value.toLowerCase();
        }
        if (eventVal.name === '_amountUT') {
          transferEvent['amount'] = eventVal.value;
        }
      }

      transferEvent['refreshEconomyDetails'] = 1;
      oThis.tokenTransfers.push(transferEvent);
    }
  }
}

module.exports = FormatTransactionLogs;
