'use strict';
/**
 * Base class for sharded models
 *
 * @module lib/models/sharded/Base
 */
const mustache = require('mustache');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseModel = require(rootPrefix + '/lib/models/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

/**
 * Class for sharded models base
 *
 * @class
 */
class ShardedBase extends BaseModel {
  /**
   * Constructor for Base class for sharded models
   *
   * @augments BaseModel
   *
   * @param {Object} params
   * @param {Number} params.chainId: chainId
   * @param {Number} params.consistentRead: (1,0)
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this,
      storageProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'storageProvider');

    oThis.openSTStorage = storageProvider.getInstance(storageConstants.sharded, params.chainId);
    oThis.chainId = params.chainId;
    oThis.consistentRead = !!params.consistentRead;
    oThis.ddbServiceObj = oThis.openSTStorage.dynamoDBService;
  }

  // TODO: This creates new object every time, try to find a solution and implement it cleanly.
  /**
   * Create shard helper object
   * @returns {*}
   */
  get shardHelper() {
    const oThis = this;

    return new oThis.openSTStorage.model.ShardHelper({
      table_schema: oThis.tableSchema(),
      shard_name: oThis.tableName()
    });
  }

  /**
   * Create shard
   *
   * @returns {Promise}
   */
  createShard() {
    const oThis = this;

    return oThis.shardHelper.createShard();
  }

  /**
   * Get Table name.
   *
   * @returns {String}: returns the table name by substituting the template vars in template
   */
  tableName() {
    const oThis = this,
      tableNameTemplate = oThis.tablePrefix + '' + oThis.tableNameTemplate(),
      tableNameVars = oThis.tableNameTemplateVars();

    return mustache.render(tableNameTemplate, tableNameVars);
  }

  /**
   * It should return the table identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    throw 'sub class to implement';
  }

  /**
   * It should return the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    throw 'sub class to implement';
  }

  /**
   * It should return the map whose key should be replaced in the map.
   *
   * @returns {Object}
   */
  tableNameTemplateVars() {
    throw 'sub class to implement';
  }

  generatePaginationTimestamp(blockTimestamp, transactionIndex, eventIndex) {
    throw 'sub class to implement';
  }

  splitPaginationTimestamp(paginationTimestamp) {
    throw 'sub class to implement';
  }
}

module.exports = ShardedBase;
