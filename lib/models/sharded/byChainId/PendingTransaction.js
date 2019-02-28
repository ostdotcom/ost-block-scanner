'use strict';
/**
 * Model for PendingTransaction table
 *
 * @module lib/models/sharded/ByChainId/PendingTransaction
 */
const rootPrefix = '../../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ShardedBase = require(rootPrefix + '/lib/models/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByHash');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/PendingTransactionByUuid');

let longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for PendingTransaction model
 *
 * @class
 */
class PendingTransactionModel extends ShardedBase {
  /**
   * Constructor for pending transaction model
   *
   * @augments ShardedBase
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chainId
   * @param {Number} params.consistentRead
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
      transactionUuid: 'txuuid',
      chainId: 'cid',
      transactionHash: 'txh',
      fromAddress: 'fad',
      toAddress: 'tad',
      value: 'val',
      gasLimit: 'gl',
      gasPrice: 'gp',
      nonce: 'nn',
      input: 'ip',
      r: 'r',
      s: 's',
      v: 'v',
      createdTimestamp: 'cts',
      updatedTimestamp: 'uts',
      afterReceipt: 'ar'
    };
  }

  /**
   * Default short name to data type mapes
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      txuuid: 'S',
      cid: 'N',
      txh: 'S',
      fad: 'S',
      tad: 'S',
      val: 'N',
      gl: 'N',
      gp: 'N',
      nn: 'N',
      ip: 'S',
      r: 'S',
      s: 'S',
      v: 'S',
      cts: 'N',
      uts: 'N',
      ar: 'S'
    };
  }

  /**
   * It should return the table name identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    return 'pendingTransactions';
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{txuuid: string, chainId: string, transactionHash: string, from_address: string, to_address: string, value: string, gas_limit: string, gas_price: string, nonce: string, input: string, r: string, s: string, v: string, createdTimestamp: string, updatedTimeStamp: string}}
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
   * @returns {{txuuid: string, cid: string, txh: string, fad: string, tad: string, val: string, gl: string, gp: string, nn: string, ip: string, r: string, s: string, v: string, cts: string, vts: string}}
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
    return '{{chainId}}_pending_transactions';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {{chainId: *}}
   */
  tableNameTemplateVars() {
    const oThis = this;

    return {
      chainId: oThis.chainId
    };
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForUuid = oThis.shortNameFor('transactionUuid');

    return 'attribute_not_exists(' + shortNameForChainId + ') AND attribute_not_exists(' + shortNameForUuid + ')';
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

    keyObj[oThis.shortNameFor('transactionUuid')] = { S: params['transactionUuid'] };
    keyObj[oThis.shortNameFor('chainId')] = { N: params['chainId'] };

    return keyObj;
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('transactionHash') + '.' + oThis.shortNameFor('chainId');
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
            AttributeName: oThis.shortNameFor('transactionUuid'),
            KeyType: 'HASH'
          },
          {
            AttributeName: oThis.shortNameFor('chainId'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('transactionUuid'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('chainId'), AttributeType: 'N' },
          { AttributeName: oThis.shortNameFor('transactionHash'), AttributeType: 'S' }
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
                AttributeName: oThis.shortNameFor('transactionHash'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('chainId'),
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
          }
        ]
      };
    return tableSchema;
  }

  /**
   * This function adds TableName and Key to updateParams
   *
   * @param {Object} dataToUpdate
   *
   * @returns {Promise<void>}
   */
  async updateItem(dataToUpdate) {
    const oThis = this;

    let formattedQuery = {
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      Key: oThis._keyObj(dataToUpdate),
      ReturnValues: 'ALL_NEW',
      TableName: oThis.tableName()
    };

    let keys = Object.keys(formattedQuery['Key']),
      formattedData = oThis._formatDataForDynamo(dataToUpdate),
      expressionArray = [],
      index = 1;

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      delete formattedData[key];
    }

    for (let key in formattedData) {
      let attrName = '#ui' + index;
      let attrValue = ':ui' + index;
      index = index + 1;
      formattedQuery['ExpressionAttributeNames'][attrName] = key.toString();
      formattedQuery['ExpressionAttributeValues'][attrValue] = formattedData[key];
      expressionArray.push(attrName + ' = ' + attrValue);
    }

    formattedQuery['UpdateExpression'] = 'SET ' + expressionArray.join(',');

    let updateQueryRsp = await oThis.ddbServiceObj.updateItem(formattedQuery);
    if (updateQueryRsp.isFailure()) {
      return updateQueryRsp;
    }

    await oThis.afterUpdate(dataToUpdate);

    return responseHelper.successWithData(oThis._formatRowFromDynamo(updateQueryRsp.data.Attributes));
  }

  /**
   *  This function retrieves data based on chainId and transactionUuid.
   *
   * @param {Array} transactionUuids
   *
   * @returns {Promise<>}
   */
  async getPendingTransactionData(transactionUuids) {
    const oThis = this;

    let params = [];
    for (let index in transactionUuids) {
      params.push(
        oThis._keyObj({
          transactionUuid: transactionUuids[index],
          chainId: oThis.chainId
        })
      );
    }

    let batchGetParams = { RequestItems: {} };
    batchGetParams.RequestItems[oThis.tableName()] = {
      Keys: params,
      ConsistentRead: oThis.consistentRead
    };

    let batchGetRsp = await oThis.ddbServiceObj.batchGetItem(batchGetParams);

    if (batchGetRsp.isFailure()) {
      return Promise.reject(batchGetRsp);
    }

    let unprocessedKeys = batchGetRsp.data.UnprocessedKeys;
    if (Object.keys(unprocessedKeys).length > 0) {
      let unprocessedKeysLength = unprocessedKeys[oThis.shardName]['Keys'].length;
      logger.error(`batchGetItem getEconomyData chainId : ${chainId} UnprocessedKeys : ${unprocessedKeysLength}`);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbt_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    return responseHelper.successWithData(oThis._formatRowsFromDynamo(dbRows, 'transactionUuid'));
  }

  /**
   * This method queries data on pending transaction data table.
   * Using that data it perform batchGet and returns the data.
   *
   * @param {Array} transactionHashes
   *
   * @returns {Promise<*>}
   */
  async getPendingTransactionsWithHashes(transactionHashes) {
    const oThis = this,
      promiseArray = [],
      shortNameForChainId = oThis.longToShortNamesMap['chainId'],
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      shortNameForTransactionHash = oThis.longToShortNamesMap['transactionHash'],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash];

    for (let index = 0; index < transactionHashes.length; index++) {
      let queryParams = {
        TableName: oThis.tableName(),
        IndexName: oThis.firstGlobalSecondaryIndexName(),
        KeyConditionExpression: '#chainId = :chainId AND #transactionHash = :txh',
        ExpressionAttributeNames: {
          '#chainId': shortNameForChainId,
          '#transactionHash': shortNameForTransactionHash
        },
        ExpressionAttributeValues: {
          ':chainId': { [dataTypeForChainId]: oThis.chainId.toString() },
          ':txh': { [dataTypeForTransactionHash]: transactionHashes[index] }
        }
      };

      promiseArray.push(oThis.ddbServiceObj.query(queryParams));
    }

    let responses = await Promise.all(promiseArray);

    let formattedData = {},
      buffer;

    for (let index = 0; index < responses.length; index++) {
      if (responses[index] && responses[index].data && responses[index].data.Items) {
        let result = responses[index].data.Items[0];
        if (result) {
          buffer = oThis._formatRowFromDynamo(result);
          formattedData[buffer.transactionHash] = {
            transactionUuid: buffer.transactionUuid
          };
        }
      }
    }

    return responseHelper.successWithData(formattedData);
  }

  /**
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache(params) {
    const oThis = this,
      PendingTransactionByHashCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionByHashCache'),
      PendingTransactionByUuidCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'PendingTransactionByUuidCache');

    let promises = [];

    let pendingTransactionByUuidCache = new PendingTransactionByUuidCache({
      chainId: params.chainId,
      transactionUuids: [params.transactionUuid]
    });

    promises.push(pendingTransactionByUuidCache.clear());

    if (oThis.transactionHash) {
      let pendingTransactionByHashCache = new PendingTransactionByHashCache({
        chainId: params.chainId,
        transactionHashes: [params.transactionHash]
      });

      promises.push(pendingTransactionByHashCache.clear());
    }

    await Promise.all(promises);
  }

  /**
   * Things to do after update - like clear cache etc.
   *
   * @returns {Promise<void>}
   */
  async afterUpdate(params) {
    const oThis = this;
    await oThis.clearCache(params);
  }
}

InstanceComposer.registerAsShadowableClass(
  PendingTransactionModel,
  coreConstants.icNameSpace,
  'PendingTransactionModel'
);
module.exports = PendingTransactionModel;
