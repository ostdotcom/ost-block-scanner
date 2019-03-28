'use strict';
/**
 * This file has the general error config.
 *
 * @module config/error/general
 */
const generalErrorConfig = {
  something_went_wrong: {
    http_code: '500',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong.'
  },
  validations_failed: {
    http_code: '500',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Validations failed.'
  },
  ddb_batch_get_failed: {
    http_code: '422',
    code: 'UNPROCESSABLE_ENTITY',
    message: 'DDB Batch GET failed for some or all entries.'
  }
};

module.exports = generalErrorConfig;
