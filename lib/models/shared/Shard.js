'use strict';
/**
 * Shard model
 *
 * @module lib/models/shared/Shard
 */
const rootPrefix = '../../..',
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const InstanceComposer = OSTBase.InstanceComposer;

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for shard model
 *
 * @class
 */
class ShardModel extends SharedBase {
  /**
   * Constructor for shard model
   *
   * @augments SharedBase
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      identifier: 'id',
      shardNumber: 'sn',
      isAvailableForAllocation: 'iafa'
    };
  }

  /**
   * Default short name to data type map
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      id: 'S',
      sn: 'N',
      iafa: 'BOOL'
    };
  }

  /**
   * Set mapping of long column names to their short names.
   *
   * @returns {*}
   */
  setLongToShortNamesMap() {
    const oThis = this;

    if (_longToShortNamesMap) return _longToShortNamesMap;

    _longToShortNamesMap = oThis._getMergedLongToShortNamesMap();

    return _longToShortNamesMap;
  }

  /**
   * Get long names to short names map.
   *
   * @returns {*}
   */
  get longToShortNamesMap() {
    return _longToShortNamesMap;
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {Object|*}
   */
  get shortToLongNamesMap() {
    const oThis = this;

    return oThis.getSetShortToLongNamesMap(shortToLongNamesMap);
  }

  /**
   * Mapping for short names to data types.
   *
   * @returns {{id: string, sn: string, iafa: string}}
   */
  get shortNameToDataType() {
    const oThis = this;

    return oThis.getSetShortNameToDataType(shortNameToDataType);
  }

  /**
   * Returns the table name.
   *
   * @returns {String}
   */
  tableName() {
    return this.tablePrefix + 'shards';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForIdentifier = oThis.shortNameFor('identifier'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber');

    return (
      'attribute_not_exists(' + shortNameForIdentifier + ') AND attribute_not_exists(' + shortNameForShardNumber + ')'
    );
  }

  /**
   * Primary key of the table.
   *
   * @param params
   * @returns {Object}
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    keyObj[oThis.shortNameFor('identifier')] = { S: params['identifier'].toLowerCase() };
    keyObj[oThis.shortNameFor('shardNumber')] = { N: params['shardNumber'].toString() };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      tableSchema = {
        TableName: oThis.tableName(),
        KeySchema: [
          {
            AttributeName: oThis.shortNameFor('identifier'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('shardNumber'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('identifier'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('shardNumber'), AttributeType: 'N' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        },
        SSESpecification: {
          Enabled: false
        }
      };

    return tableSchema;
  }

  /**
   * Gets list of shards which are available for allocation
   *
   * @returns {Object}
   */
  async getAvailableShards() {
    const oThis = this,
      shortNameForIsAvailable = oThis.shortNameFor('isAvailableForAllocation'),
      shortNameForIdentifier = oThis.shortNameFor('identifier'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber'),
      dataTypeForIdentifier = oThis.shortNameToDataType[shortNameForIdentifier],
      dataTypeForShardNumber = oThis.shortNameToDataType[shortNameForShardNumber],
      availableShards = {};

    let queryParams = {
      TableName: oThis.tableName(),
      FilterExpression: `${shortNameForIsAvailable} = :iafa`,
      ExpressionAttributeValues: {
        ':iafa': { BOOL: true }
      },
      ConsistentRead: oThis.consistentRead
    };

    let response = await oThis.ddbServiceObj.scan(queryParams);

    if (response.isFailure()) {
      return response;
    }

    if (!response.data.Items || !response.data.Items[0]) {
      return Promise.resolve(responseHelper.successWithData(availableShards));
    }

    let row, identifier, shardNumber, tableTypePrefix, buffer;
    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      identifier = row[shortNameForIdentifier][dataTypeForIdentifier];
      buffer = oThis.splitIdentifier(identifier);
      tableTypePrefix = buffer['tableTypePrefix'];
      shardNumber = row[shortNameForShardNumber][dataTypeForShardNumber];
      if (!availableShards[tableTypePrefix]) {
        availableShards[tableTypePrefix] = [];
      }
      availableShards[tableTypePrefix].push(shardNumber);
    }

    return Promise.resolve(responseHelper.successWithData(availableShards));
  }

  /**
   * Gets list of shards which are available for allocation
   *
   * @returns {Object}
   */
  async getAvailableShardsOf(shardKind) {
    const oThis = this,
      shortNameForIsAvailable = oThis.shortNameFor('isAvailableForAllocation'),
      shortNameForIdentifier = oThis.shortNameFor('identifier'),
      dataTypeForIdentifier = oThis.shortNameToDataType[shortNameForIdentifier];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForIdentifier} = :id`,
      FilterExpression: `${shortNameForIsAvailable} = :iafa`,
      ExpressionAttributeValues: {
        ':id': { [dataTypeForIdentifier]: shardKind },
        ':iafa': { BOOL: true }
      }
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    return Promise.resolve(response);
  }

  /**
   * Gets identifier delimiter
   *
   * @returns {String}
   */
  identifierDelimiter() {
    return '_';
  }

  /**
   * Generates identifier
   *
   * @param {String} tableTypePrefix
   * @param {String} tableIdentifier
   *
   * @returns {String}
   */
  generateIdentifier(tableTypePrefix, tableIdentifier) {
    const oThis = this;

    return `${tableTypePrefix}${oThis.identifierDelimiter()}${tableIdentifier}`;
  }

  /**
   * Split identifier
   *
   * @param {String} identifier
   *
   * @returns {Object}
   */
  splitIdentifier(identifier) {
    const oThis = this,
      buffer = identifier.split(oThis.identifierDelimiter());

    return {
      tableTypePrefix: buffer[0],
      tableIdentifier: buffer[1]
    };
  }

  /**
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache() {
    const oThis = this;
  }

  /**
   * Things to do after update - like clear cache etc.
   *
   * @returns {Promise<void>}
   */
  async afterUpdate() {
    const oThis = this;

    await oThis.clearCache();
  }
}

InstanceComposer.registerAsShadowableClass(ShardModel, coreConstants.icNameSpace, 'ShardModel');

module.exports = ShardModel;
