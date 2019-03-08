'use strict';
/**
 * Economy address transaction Model
 *
 * @module lib/models/sharded/byEconomyAddress/EconomyAddressTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ShardedBase = require(rootPrefix + '/lib/models/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for economy address transaction model
 *
 * @class
 */
class EconomyAddressTransactionModel extends ShardedBase {
  /**
   * Constructor for economy address transaction model
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chainId
   * @param {String} params.shardIdentifier: shardIdentifier
   * @param {Number} params.consistentRead
   * @param {Number} params.pageSize
   *
   * @augments ShardedBase
   *
   * @sets oThis.shardByEconomyAddressShardIdentifier
   * @sets oThis.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.shardByEconomyAddressShardIdentifier = params.shardIdentifier;
    oThis.pageSize = params.pageSize || paginationLimits.addressTransactionsLimit;
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      addressIdentifier: 'adid',
      paginationTimestamp: 'pgts',
      transactionHash: 'txh'
    };
  }

  /**
   * Default short name to data type map
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      adid: 'S',
      pgts: 'S',
      txh: 'S'
    };
  }

  /**
   * It should return the table name identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    return 'economyAddressTransactions';
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
   * Mapping of short column names to their long names.
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
   * @returns {{adid: string, pgts: string, sbtsid: string, txh: string}}
   */
  get shortNameToDataType() {
    const oThis = this;

    return oThis.getSetShortNameToDataType(shortNameToDataType);
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return '{{shardByEconomyAddressShardIdentifier}}_economy_address_transactions';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {Object}
   */
  tableNameTemplateVars() {
    const oThis = this;

    return {
      shardByEconomyAddressShardIdentifier: oThis.shardByEconomyAddressShardIdentifier
    };
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForAddressIdentifier = oThis.shortNameFor('addressIdentifier'),
      shortNameForPaginationTimestamp = oThis.shortNameFor('paginationTimestamp');
    return (
      'attribute_not_exists(' +
      shortNameForAddressIdentifier +
      ') AND attribute_not_exists(' +
      shortNameForPaginationTimestamp +
      ')'
    );
  }

  /**
   * Primary key of the table.
   *
   * @param {Object} params
   * @param {String} params.addressIdentifier
   * @param {String} params.paginationTimestamp
   *
   * @returns {Object}
   *
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    keyObj[oThis.shortNameFor('addressIdentifier')] = { S: params['addressIdentifier'] };
    keyObj[oThis.shortNameFor('paginationTimestamp')] = {
      S: params['paginationTimestamp']
    };

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
            AttributeName: oThis.shortNameFor('addressIdentifier'),
            KeyType: 'HASH'
          },
          {
            AttributeName: oThis.shortNameFor('paginationTimestamp'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('addressIdentifier'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('paginationTimestamp'), AttributeType: 'S' }
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

  /**
   * This method fetches the transactions hashes for a address from a contract.
   *
   * @param {String} address
   * @param {String} economyContractAddress
   * @param {Object} lastEvaluatedKey
   *
   * @returns {Promise<*>}
   */
  async getRecentTransactionHashes(address, economyContractAddress, lastEvaluatedKey) {
    const oThis = this,
      shortNameForAddressIdentifier = oThis.shortNameFor('addressIdentifier'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForAddressIdentifier = oThis.shortNameToDataType[shortNameForAddressIdentifier],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash],
      recentTransactionHashes = [];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForAddressIdentifier} = :ai`,
      ExpressionAttributeValues: {
        ':ai': { [dataTypeForAddressIdentifier]: oThis.generateIdentifier(address, economyContractAddress) }
      },
      ProjectionExpression: oThis.shortNameFor('transactionHash'),
      Limit: oThis.pageSize,
      ScanIndexForward: false
    };

    if (lastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = lastEvaluatedKey;
    }
    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return response;
    }

    let row;
    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      recentTransactionHashes.push(row[shortNameForTransactionHash][dataTypeForTransactionHash]);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        transactionHashes: recentTransactionHashes,
        nextPagePayload: { LastEvaluatedKey: response.data.LastEvaluatedKey }
      })
    );
  }

  /**
   * Returns the delimiter.
   *
   * @returns {String}
   */
  get delimiter() {
    return '-';
  }

  /**
   * Returns the identifiers
   *
   * @param {String} address
   * @param {String} contractAddress
   *
   * @returns {String}
   */
  generateIdentifier(address, contractAddress) {
    const oThis = this;

    return `${address.toLowerCase()}${oThis.delimiter}${oThis.chainId}${
      oThis.delimiter
    }${contractAddress.toLowerCase()}`;
  }
}

InstanceComposer.registerAsShadowableClass(
  EconomyAddressTransactionModel,
  coreConstants.icNameSpace,
  'EconomyAddressTransactionModel'
);

module.exports = EconomyAddressTransactionModel;
