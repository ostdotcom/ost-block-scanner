'use strict';
/**
 * Pagination limits.
 *
 * @module lib/globalConstant/paginationLimits
 */
class PaginationLimits {
  constructor() {}

  get addressTransactionsLimit() {
    return 25;
  }

  get blockTransactionsLimit() {
    return 25;
  }

  get chainTransactionsLimit() {
    return 25;
  }

  get addressTransfersLimit() {
    return 25;
  }

  get recentBlocksLimit() {
    return 25;
  }

  get tokenTransfersLimit() {
    return 10;
  }

  get tokenHoldersLimit() {
    return 10;
  }
}

module.exports = new PaginationLimits();
