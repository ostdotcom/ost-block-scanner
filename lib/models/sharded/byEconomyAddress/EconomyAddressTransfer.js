'use strict';
/**
 * Economy Address Transfer Model
 *
 * @module lib/models/sharded/byEconomyAddress/EconomyAddressTransfer
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ShardedBase = require(rootPrefix + '/lib/models/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for economy address transfer model
 *
 * @class
 */
class EconomyAddressTransferModel extends ShardedBase {
  /**
   * Constructor for economy address transfer model
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chainId
   * @param {String} params.shardIdentifier: shardIdentifier
   * @param {Number} params.consistentRead
   * @param {Number} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.shardByEconomyAddressShardIdentifier = params.shardIdentifier;
    oThis.pageSize = params.pageSize || paginationLimits.addressTransfersLimit;
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
    return 'economyAddressTransfers';
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
    return '{{shardByEconomyAddressShardIdentifier}}_economy_address_transfers';
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
   * @param params
   *
   * @returns {Object}
   *
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    keyObj[oThis.shortNameFor('addressIdentifier')] = { S: params['addressIdentifier'] };
    keyObj[oThis.shortNameFor('paginationTimestamp')] = { S: params['paginationTimestamp'] };

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
   * @param {Object} LastEvaluatedKey
   *
   * @returns {Promise<*>}
   */
  async getRecentTransfers(address, economyContractAddress, LastEvaluatedKey) {
    const oThis = this,
      shortNameForAddressIdentifier = oThis.shortNameFor('addressIdentifier'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      shortNameForPaginationTimestamp = oThis.shortNameFor('paginationTimestamp'),
      dataTypeForAddressIdentifier = oThis.shortNameToDataType[shortNameForAddressIdentifier],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash],
      dataTypeForPaginationTimestamp = oThis.shortNameToDataType[shortNameForPaginationTimestamp],
      transactionHashToTransferEventsMap = {},
      addressTransferArray = [];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForAddressIdentifier} = :ai`,
      ExpressionAttributeValues: {
        ':ai': { [dataTypeForAddressIdentifier]: oThis.generateIdentifier(address, economyContractAddress) }
      },
      ProjectionExpression: `${shortNameForTransactionHash},${shortNameForPaginationTimestamp}`,
      Limit: oThis.pageSize,
      ScanIndexForward: false
    };

    if (LastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = LastEvaluatedKey;
    }
    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return response;
    }

    for (let i = 0; i < response.data.Items.length; i++) {
      let formattedRow = oThis._formatRowFromDynamo(response.data.Items[i]),
        paginationTimestampDetails = oThis.splitPaginationTimestamp(formattedRow.paginationTimestamp);

      formattedRow.eventIndex = paginationTimestampDetails['eventIndex'];
      formattedRow.blockTimestamp = paginationTimestampDetails['blockTimestamp'];
      addressTransferArray.push(formattedRow);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        addressTransfers: addressTransferArray,
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

  /**
   * This function is used to generate pagination timestamp.
   *
   * @param {Integer} blockTimestamp
   * @param {Integer} transactionIndex
   * @param {Integer} eventIndex
   *
   * @returns {String}
   */
  generatePaginationTimestamp(blockTimestamp, transactionIndex, eventIndex) {
    return util.generatePaginationTimestamp(blockTimestamp, transactionIndex, eventIndex);
  }

  /**
   * This function is used to split pagination timestamp.
   *
   * @param {String} paginationTimestamp
   *
   * @returns {Object}
   */
  splitPaginationTimestamp(paginationTimestamp) {
    const buffer = util.splitPaginationTimestamp(paginationTimestamp);

    return {
      blockTimestamp: buffer['baseNumber'],
      transactionIndex: buffer['power1'],
      eventIndex: buffer['power2']
    };
  }
}

InstanceComposer.registerAsShadowableClass(
  EconomyAddressTransferModel,
  coreConstants.icNameSpace,
  'EconomyAddressTransferModel'
);

module.exports = EconomyAddressTransferModel;
