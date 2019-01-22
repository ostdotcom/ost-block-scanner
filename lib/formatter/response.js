'use strict';
/**
 * Standard response formatter
 *
 * @module lib/formatter/response
 */
const OSTBase = require('@openstfoundation/openst-base'),
  responseHelper = new OSTBase.responseHelper({
    module_name: 'openstBlockScanner'
  });

module.exports = responseHelper;
