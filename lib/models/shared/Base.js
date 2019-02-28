'use strict';
/**
 * Base class for shared models
 *
 * @module lib/models/shared/Base
 */
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseModel = require(rootPrefix + '/lib/models/Base'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

/**
 * Class for base class of shared models
 *
 * @constructor
 */
class SharedBaseKlass extends BaseModel {
  /**
   * Constructor for Base class for shared models
   *
   * @augments BaseModel
   *
   * @param {Object} params
   * @param {Number} params.consistentRead: (1,0)
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this,
      storageProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'storageProvider'),
      ostStorage = storageProvider.getInstance(storageConstants.shared);

    oThis.consistentRead = !!params.consistentRead;

    oThis.ddbServiceObj = ostStorage.dynamoDBService;

    oThis.shardHelper = new ostStorage.model.DynamodbShardHelper({
      table_schema: oThis.tableSchema(),
      shard_name: oThis.tableName()
    });
  }

  /**
   * Create shard
   *
   * @returns {Promise<result>}
   */
  createTable() {
    const oThis = this;

    return oThis.shardHelper.createShard();
  }

  /**
   * It should return the table identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    const oThis = this;
    return oThis.tableName();
  }
}

module.exports = SharedBaseKlass;
