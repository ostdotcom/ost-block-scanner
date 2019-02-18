/**
 * Load all the event constants.
 *
 * @module config/eventConstants
 */

/**
 * Class for event constants
 *
 * @class
 */
class EventConstants {
  /**
   * Get transfer event.
   *
   * @returns {string}
   */
  get transferEvent() {
    return 'transfer';
  }

  /**
   * Get mintProgressed event.
   *
   * @returns {string}
   */
  get mintProgressedEvent() {
    return 'mintprogressed';
  }

  /**
   * Get mintProgressed event.
   *
   * @returns {string}
   */
  get redeemProgressedEvent() {
    return 'redeemprogressed';
  }

  /**
   * Get all known events array.
   *
   * @returns {Array}
   */
  getAllEvents() {
    const oThis = this;

    return [oThis.mintProgressedEvent, oThis.redeemProgressedEvent];
  }

  /**
   * Method signature for transfer event
   *
   * @returns {String}
   *
   * @private
   */
  get _transferEventSignature() {
    return '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  }

  /**
   * Method signature for MintProgressed event
   *
   * @returns {String}
   *
   * @private
   */
  get _mintProgressedEventSignature() {
    return '0xbf81e8c456a7484e025395ab4e1492b688012d0f5256401f71d9d0a16b5d68d3';
  }

  /**
   * Method signature for RedeemProgressed event
   *
   * @returns {String}
   *
   * @private
   */
  get _redeemProgressedEventSignature() {
    return '';
  }

  /**
   * Get an array of parsable signatures.
   *
   * @returns {Array}
   */
  getParsableSignatures() {
    const oThis = this;

    return [oThis._transferEventSignature];
  }

  /**
   * Get an array of all known signatures.
   *
   * @returns {Array}
   */
  getAllSignatures() {
    const oThis = this;

    return [oThis._transferEventSignature, oThis._mintProgressedEventSignature, oThis._redeemProgressedEventSignature];
  }

  /**
   * Get map of event signature to its name.
   *
   * @returns {Object}
   */
  eventSignatureToName() {
    const oThis = this;

    return {
      [oThis._transferEventSignature]: oThis.transferEvent,
      [oThis._mintProgressedEventSignature]: oThis.mintProgressedEvent,
      [oThis._redeemProgressedEventSignature]: oThis.redeemProgressedEvent
    };
  }
}

module.exports = new EventConstants();
