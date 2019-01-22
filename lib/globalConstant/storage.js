'use strict';
/**
 * Storage constants
 *
 * @module lib/globalConstant/storage
 */

/**
 * Class for storage constants
 *
 * @class
 */
class StorageConstants {
  /**
   * Constructor for storage constants
   *
   * @constructor
   */
  constructor() {}

  get shared() {
    return 'shared';
  }

  get sharded() {
    return 'sharded';
  }
}

module.exports = new StorageConstants();
