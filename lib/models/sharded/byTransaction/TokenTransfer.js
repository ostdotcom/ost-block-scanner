'use strict';
/**
 * Token Transfer Model
 *
 * @module lib/models/sharded/byTransaction/TokenTransfer
 */
const rootPrefix = '../../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ShardedBase = require(rootPrefix + '/lib/models/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

let longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for token transfer model
 *
 * @class
 */
class TokenTransferModel extends ShardedBase {
  /**
   * Constructor for token transfer model
   *
   * @augments ShardedBase
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chain id
   * @param {String} params.shardIdentifier: shard identifier
   * @param {Number} params.consistentRead
   * @param {Number} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.shardByTransactionShardIdentifier = params.shardIdentifier;
    oThis.pageSize = params.pageSize || paginationLimits.tokenTransfersLimit;
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      transactionHash: 'txh',
      eventIndex: 'eveid',
      blockNumber: 'bno',
      contractAddress: 'ca',
      fromAddress: 'fad',
      toAddress: 'tad',
      amount: 'amt'
    };
  }

  /**
   * Default short name to data type map
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      txh: 'S',
      eveid: 'N',
      bno: 'N',
      ca: 'S',
      fad: 'S',
      tad: 'S',
      amt: 'S'
    };
  }

  /**
   * It should return the table name identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    return 'tokenTransfers';
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{transactionHash: string, eventIndex: string, blockNumber: string, contractAddress: string, fromAddress: string, toAddress: string, amount: string}}
   */
  get longToShortNamesMap() {
    const oThis = this;
    return oThis.getSetLongToShortNamesMap(longToShortNamesMap);
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
   * @returns {{txh: string, eveid: string, bno: string, ca: string, fad: string, tad: string, amt: string}}
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
    return '{{shardByTransactionShardIdentifier}}_token_transfers';
  }

  /**
   * Returns the table name identifier.
   *
   * @returns {String}
   */
  tableNameIdentifier() {
    return 'tokenTransfers';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {{shardByTransactionShardIdentifier: *}}
   */
  tableNameTemplateVars() {
    const oThis = this;

    return {
      shardByTransactionShardIdentifier: oThis.shardByTransactionShardIdentifier
    };
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      shortNameForEventIndex = oThis.shortNameFor('eventIndex');
    return (
      'attribute_not_exists(' +
      shortNameForTransactionHash +
      ') AND attribute_not_exists(' +
      shortNameForEventIndex +
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

    keyObj[oThis.shortNameFor('transactionHash')] = { S: params['transactionHash'] };
    keyObj[oThis.shortNameFor('eventIndex')] = { N: params['eventIndex'] };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this;

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: oThis.shortNameFor('transactionHash'),
          KeyType: 'HASH'
        },
        {
          AttributeName: oThis.shortNameFor('eventIndex'),
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: oThis.shortNameFor('transactionHash'), AttributeType: 'S' },
        { AttributeName: oThis.shortNameFor('eventIndex'), AttributeType: 'N' }
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
   * Get token transfer details
   *
   * @param {Object} transactionHashEventIndexesMap
   *
   * @returns {*|Promise<result>}
   */
  async getTransfers(transactionHashEventIndexesMap) {
    const oThis = this;

    let getKeys = [],
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      shortNameForEventIndex = oThis.shortNameFor('eventIndex'),
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash],
      dataTypeForEventIndex = oThis.shortNameToDataType[shortNameForEventIndex];

    for (let txHash in transactionHashEventIndexesMap) {
      let eventIndexes = transactionHashEventIndexesMap[txHash];
      for (let i = 0; i < eventIndexes.length; i++) {
        let buffer = {};
        buffer[shortNameForTransactionHash] = { [dataTypeForTransactionHash]: txHash.toLowerCase() };
        buffer[shortNameForEventIndex] = { [dataTypeForEventIndex]: eventIndexes[i].toString() };
        getKeys.push(buffer);
      }
    }

    let batchGetParams = { RequestItems: {} };
    batchGetParams.RequestItems[oThis.tableName()] = {
      Keys: getKeys,
      ConsistentRead: oThis.consistentRead
    };

    let batchGetRsp = await oThis.ddbServiceObj.batchGetItem(batchGetParams);

    if (batchGetRsp.isFailure()) {
      return Promise.reject(batchGetRsp);
    }

    let unprocessedKeys = batchGetRsp.data.UnprocessedKeys;
    if (Object.keys(unprocessedKeys).length > 0) {
      let unprocessedKeysLength = unprocessedKeys[oThis.shardName]['Keys'].length;
      logger.error(`batchGetItem getTransfers chainId : ${oThis.chainId} UnprocessedKeys : ${unprocessedKeysLength}`);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_by_eab_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()],
      formattedDbRows = {};

    for (let i = 0; i < dbRows.length; i++) {
      let formattedDbRow = oThis._formatRowFromDynamo(dbRows[i]);
      formattedDbRows[
        `${TokenTransferModel.generateIdentifier(formattedDbRow['transactionHash'], formattedDbRow['eventIndex'])}`
      ] = formattedDbRow;
    }

    return Promise.resolve(responseHelper.successWithData(formattedDbRows));
  }

  /**
   * Returns all the token transfers associated with a transaction hash.
   *
   * @param {String} transactionHash
   * @param {Object} LastEvaluatedKey
   *
   * @returns {Promise<*>}
   */
  async getAllTransfers(transactionHash, LastEvaluatedKey) {
    const oThis = this;

    let finalResponse = {},
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForTransactionHash} = :txhs`,
      ExpressionAttributeValues: {
        ':txhs': { [dataTypeForTransactionHash]: transactionHash }
      },
      Limit: oThis.pageSize
    };

    if (LastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = LastEvaluatedKey;
    }
    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return response;
    }

    let dbRows = response.data.Items,
      formattedRsp = oThis._formatRowsFromDynamo(dbRows, 'eventIndex'),
      eventIndices = Object.keys(formattedRsp);

    finalResponse[transactionHash] = {};
    finalResponse[transactionHash]['nextPagePayload'] = {};
    finalResponse[transactionHash]['eventIndices'] = eventIndices;
    finalResponse[transactionHash]['transfers'] = formattedRsp;
    finalResponse[transactionHash]['nextPagePayload']['LastEvaluatedKey'] = response.data.LastEvaluatedKey;

    return Promise.resolve(responseHelper.successWithData(finalResponse));
  }

  /**
   * Returns the delimiter.
   *
   * @returns {String}
   */
  static get deLimiter() {
    return '-';
  }

  /**
   * Returns the identifiers
   *
   * @param {String} txHash
   * @param {Number} eventIndex
   *
   * @returns {String}
   */
  static generateIdentifier(txHash, eventIndex) {
    return `${txHash.toLowerCase()}${TokenTransferModel.deLimiter}${eventIndex}`;
  }

  /**
   * Splits the identifier
   *
   * @param {String} identifier
   *
   * @returns {{transactionHash: (*|String), eventIndex: (*|String)}}
   */
  static splitIdentifier(identifier) {
    const buffer = identifier.split(TokenTransferModel.deLimiter);

    return {
      transactionHash: buffer[0],
      eventIndex: buffer[1]
    };
  }
}

InstanceComposer.registerAsShadowableClass(TokenTransferModel, coreConstants.icNameSpace, 'TokenTransferModel');

module.exports = TokenTransferModel;
