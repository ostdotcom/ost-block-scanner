'use strict';
/**
 * web3 constants.
 *
 * @module lib/globalConstant/web3Constants
 */
class Web3Constants {
  constructor() {}

  get geth() {
    return 'geth';
  }

  get parity() {
    return 'parity';
  }
}

module.exports = new Web3Constants();
