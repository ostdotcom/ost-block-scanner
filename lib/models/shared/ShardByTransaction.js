'use strict';
/**
 * Shard by transaction model
 *
 * @module lib/models/shared/ShardByTransaction
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  helper = require(rootPrefix + '/helpers/basic'),
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits');

const InstanceComposer = OSTBase.InstanceComposer;

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for shard by transaction model
 *
 * @class
 */
class ShardByTransactionModel extends SharedBase {
  /**
   * Constructor for shard by transaction model
   *
   * @augments SharedBase
   *
   * @param {Object} params
   * @param {Object} params.pageSize
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.pageSize = params.pageSize || paginationLimits.blockTransactionsLimit;
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      chainId: 'cid',
      transactionHash: 'txh',
      paginationTimestamp: 'pgts',
      shardIdentifier: 'sid',
      timeSlot: 'ts'
    };
  }

  /**
   * Default short name to data type map
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      cid: 'N',
      txh: 'S',
      pgts: 'S',
      sid: 'S',
      ts: 'S'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{chainId: string, transactionHash: string, paginationTimestamp: string, shardIdentifier: string}}
   */
  get longToShortNamesMap() {
    const oThis = this;

    if (_longToShortNamesMap) return _longToShortNamesMap;

    _longToShortNamesMap = oThis._getMergedLongToShortNamesMap();

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
   * @returns {{cid: string, txh: string, pgts: string, sid: string}}
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
    return this.tablePrefix + 'shard_by_transactions';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      shortNameForChainId = oThis.shortNameFor('chainId');

    return (
      'attribute_not_exists(' + shortNameForTransactionHash + ') AND attribute_not_exists(' + shortNameForChainId + ')'
    );
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('chainId') + '.' + oThis.shortNameFor('paginationTimestamp');
  }

  /**
   * Returns the second global secondary index name.
   *
   * @returns {String}
   */
  secondGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('timeSlot') + '.' + oThis.shortNameFor('paginationTimestamp');
  }

  /**
   * Returns the third global secondary index name.
   *
   * @returns {String}
   */
  thirdGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('transactionHash');
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

    keyObj[oThis.shortNameFor('transactionHash')] = { S: params['transactionHash'].toString() };
    keyObj[oThis.shortNameFor('chainId')] = { N: params['chainId'].toString() };

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
            AttributeName: oThis.shortNameFor('chainId'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('transactionHash'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          {
            AttributeName: oThis.shortNameFor('chainId'),
            AttributeType: 'N'
          },
          {
            AttributeName: oThis.shortNameFor('transactionHash'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('paginationTimestamp'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('timeSlot'),
            AttributeType: 'S'
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        },
        SSESpecification: {
          Enabled: false
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: oThis.firstGlobalSecondaryIndexName(),
            KeySchema: [
              {
                AttributeName: oThis.shortNameFor('chainId'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('paginationTimestamp'),
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'KEYS_ONLY'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            }
          },
          {
            IndexName: oThis.secondGlobalSecondaryIndexName(),
            KeySchema: [
              {
                AttributeName: oThis.shortNameFor('timeSlot'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('paginationTimestamp'),
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'KEYS_ONLY'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            }
          },
          {
            IndexName: oThis.thirdGlobalSecondaryIndexName(),
            KeySchema: [
              {
                AttributeName: oThis.shortNameFor('transactionHash'),
                KeyType: 'HASH'
              }
            ],
            Projection: {
              ProjectionType: 'KEYS_ONLY'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            }
          }
        ]
      };

    return tableSchema;
  }

  /**
   * Get shard identifiers for given transaction hashes for a chain
   *
   * @param {Number} chainId
   * @param {Array} transactionHashes
   *
   * @returns {*|Promise<result>}
   */
  async getShardIdentifiers(chainId, transactionHashes) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      shortNameForShardIdentifier = oThis.shortNameFor('shardIdentifier'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash],
      dataTypeForShardIdentifier = oThis.shortNameToDataType[shortNameForShardIdentifier],
      transactionHashShardIdentifierMap = {};

    for (let i = 0; i < transactionHashes.length; i++) {
      let buffer = {};
      buffer[shortNameForTransactionHash] = { [dataTypeForTransactionHash]: transactionHashes[i].toLowerCase() };
      buffer[shortNameForChainId] = { [dataTypeForChainId]: chainId.toString() };
      getKeys.push(buffer);
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
      logger.error(
        `batchGetItem getShardIdentifiersByBlock chainId : ${chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbt_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    for (let i = 0; i < dbRows.length; i++) {
      transactionHashShardIdentifierMap[dbRows[i][shortNameForTransactionHash][dataTypeForTransactionHash]] = {
        shardIdentifier: dbRows[i][shortNameForShardIdentifier][dataTypeForShardIdentifier]
      };
    }

    return Promise.resolve(responseHelper.successWithData(transactionHashShardIdentifierMap));
  }

  /**
   * This functions fetches the transaction hashes of a block based on its timestamp value.
   *
   * @param {Number} chainId
   * @param {String|Number} blockTimestamp
   * @param {String} LastEvaluatedKey
   *
   * @returns {Promise<void>}
   */
  async getTransactionHashesByBlockNo(chainId, blockTimestamp, LastEvaluatedKey) {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForPaginationTimestamp = oThis.shortNameFor('paginationTimestamp'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForPaginationTimestamp = oThis.shortNameToDataType[shortNameForPaginationTimestamp];

    let queryParams = {
      TableName: oThis.tableName(),
      IndexName: oThis.firstGlobalSecondaryIndexName(),
      Limit: oThis.pageSize,
      KeyConditionExpression: '#chainId = :chainId AND begins_with(#paginationTimestamp, :bts)',
      ExpressionAttributeNames: {
        '#chainId': shortNameForChainId,
        '#paginationTimestamp': shortNameForPaginationTimestamp
      },
      ExpressionAttributeValues: {
        ':chainId': { [dataTypeForChainId]: chainId.toString() },
        ':bts': { [dataTypeForPaginationTimestamp]: blockTimestamp.toString() }
      }
    };

    if (LastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = LastEvaluatedKey;
    }

    let transactionHashes = [],
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash];

    let response = await oThis.ddbServiceObj.query(queryParams),
      transactionModelResponse = response.data.Items;

    for (let index = 0; index < transactionModelResponse.length; index++) {
      let transactionHash = transactionModelResponse[index][shortNameForTransactionHash][dataTypeForTransactionHash];
      transactionHashes.push(transactionHash);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        transactionHashes: transactionHashes,
        nextPagePayload: { LastEvaluatedKey: response.data.LastEvaluatedKey }
      })
    );
  }

  /**
   * This method fetches the transactions hashes.
   *
   * @param {Number} chainId
   * @param {String} LastEvaluatedKey
   *
   * @returns {Promise<*>}
   */
  async getRecentTransactionHashes(chainId, LastEvaluatedKey) {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash],
      recentTransactionHashes = [];

    let queryParams = {
      TableName: oThis.tableName(),
      IndexName: oThis.firstGlobalSecondaryIndexName(),
      KeyConditionExpression: `${shortNameForChainId} = :c`,
      ExpressionAttributeValues: {
        ':c': { [dataTypeForChainId]: chainId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('transactionHash'),
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
   * This function will give all the chain ids in which the given transaction hash is present.
   *
   * @param {String} transaction hash
   *
   * @returns {Promise<>} An array of chain Ids.
   */
  async fetchTransactionDetails(txHash) {
    const oThis = this;

    if (!helper.isTxHashValid(txHash)) {
      logger.error('Invalid transaction passed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbt_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let shortNameOfTxHash = oThis.longToShortNamesMap['transactionHash'],
      dataTypeOTxHash = oThis.shortNameToDataType[shortNameOfTxHash],
      expressionAttributeValue = {};

    expressionAttributeValue[dataTypeOTxHash] = txHash.toString().toLowerCase();

    let queryParams = {
      TableName: oThis.tableName(),
      IndexName: oThis.thirdGlobalSecondaryIndexName(),
      KeyConditionExpression: `${shortNameOfTxHash} = :c`,
      ExpressionAttributeValues: {
        ':c': expressionAttributeValue
      },
      Limit: oThis.pageSize,
      ScanIndexForward: false
    };

    let queryRsp = await oThis.ddbServiceObj.query(queryParams);

    if (queryRsp.isFailure()) {
      return Promise.reject(queryRsp);
    }
    let dbRows = queryRsp.data.Items,
      formattedRsp = oThis._formatRowsFromDynamoCustom(dbRows);

    return Promise.resolve(responseHelper.successWithData(formattedRsp));
  }

  /**
   * Custom method to format data from DynamoDb.
   *
   * @param {Array} dbRows
   *
   * @returns {Array}
   */
  _formatRowsFromDynamoCustom(dbRows) {
    const oThis = this,
      shortNameForTxHash = oThis.longToShortNamesMap['transactionHash'],
      dataTypeForTxHash = oThis.shortNameToDataType[shortNameForTxHash],
      shortNameForChainId = oThis.longToShortNamesMap['chainId'],
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId];

    let responseArray = [];
    for (let index in dbRows) {
      let dbRow = dbRows[index];
      responseArray[index] = {};
      responseArray[index]['transactionHash'] = dbRow[shortNameForTxHash][dataTypeForTxHash];
      responseArray[index]['chainId'] = dbRow[shortNameForChainId][dataTypeForChainId];
    }
    return responseArray;
  }

  /**
   * Clears cache
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
   * Generates the pagination timestamp
   *
   * @param {Number} blockTimestamp
   * @param {Number} transactionIndex
   *
   * @returns {*|String|void}
   */
  generatePaginationTimestamp(blockTimestamp, transactionIndex) {
    return util.generatePaginationTimestamp(blockTimestamp, transactionIndex);
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardByTransactionModel,
  coreConstants.icNameSpace,
  'ShardByTransactionModel'
);

module.exports = ShardByTransactionModel;
