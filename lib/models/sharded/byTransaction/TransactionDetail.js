'use strict';
/**
 * Transaction Detail Model
 *
 * @module lib/models/sharded/byTransaction/TransactionDetail
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
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/TransactionDetail');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for transaction details model
 *
 * @class
 */
class TransactionDetailModel extends ShardedBase {
  /**
   * Constructor for transaction details model
   *
   * @augments ShardedBase
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chain id
   * @param {String} params.shardIdentifier: shard identifier
   * @param {Number} params.consistentRead
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.shardByTransactionShardIdentifier = params.shardIdentifier;
  }

  /**
   * Default Long to short name map.
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      chainId: 'cid',
      transactionHash: 'txh',
      input: 'ip',
      logs: 'lg',
      r: 'r',
      s: 's',
      v: 'v',
      updatedTimestamp: 'uts'
    };
  }

  /**
   * Default short name to data type map.
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      cid: 'N',
      txh: 'S',
      ip: 'S',
      lg: 'S',
      r: 'S',
      s: 'S',
      v: 'S',
      uts: 'N'
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
   * @returns {Object}
   * */
  get shortNameToDataType() {
    const oThis = this;

    return oThis.getSetShortNameToDataType(shortNameToDataType);
  }

  /**
   * Returns the table identifier.
   *
   * @returns {String}
   */
  tableIdentifier() {
    return 'transactionDetails';
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return '{{shardByTransactionShardIdentifier}}_transaction_details';
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
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash');

    return (
      'attribute_not_exists(' + shortNameForChainId + ') AND attribute_not_exists(' + shortNameForTransactionHash + ')'
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

    keyObj[oThis.shortNameFor('chainId')] = { N: params['chainId'] };
    keyObj[oThis.shortNameFor('transactionHash')] = { S: params['transactionHash'] };

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
          },
          {
            AttributeName: oThis.shortNameFor('transactionHash'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('chainId'), AttributeType: 'N' },
          { AttributeName: oThis.shortNameFor('transactionHash'), AttributeType: 'S' }
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
   * Set Cache of Transaction Detail Data
   *
   * @param dbResponse
   * @returns {Promise<void>}
   */
  async setCache(dbResponse) {
    const oThis = this,
      cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionDetailCache'),
      cacheObj = new cacheKlass({
        chainId: dbResponse.chainId,
        transactionHashes: [dbResponse.transactionHash]
      });

    await cacheObj.setCache(dbResponse.transactionHash, dbResponse);
  }

  /**
   * Things to do after Update or Put Item in DB
   *
   * @param updatedData
   * @returns {Promise<*>}
   */
  async afterUpdate(updatedData) {
    const oThis = this;

    await oThis.setCache(updatedData);
  }

  /**
   * Get transaction details.
   *
   * @param {Array} transactionHashes
   * @returns {*|Promise<result>}
   */
  async getTransactionDetails(transactionHashes) {
    const oThis = this,
      selectColumns = ['chainId', 'transactionHash', 'input', 'updatedTimestamp'];

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash];

    for (let i = 0; i < transactionHashes.length; i++) {
      let buffer = {};
      buffer[shortNameForChainId] = { [dataTypeForChainId]: oThis.chainId };
      buffer[shortNameForTransactionHash] = { [dataTypeForTransactionHash]: transactionHashes[i].toLowerCase() };
      getKeys.push(buffer);
    }

    let batchGetParams = { RequestItems: {} };
    batchGetParams.RequestItems[oThis.tableName()] = {
      Keys: getKeys,
      ConsistentRead: oThis.consistentRead
    };

    let projectionExpression = oThis._attributesProjection(selectColumns);
    if (projectionExpression.length > 0) {
      batchGetParams.RequestItems[oThis.tableName()].ProjectionExpression = projectionExpression;
    }

    let batchGetRsp = await oThis.ddbServiceObj.batchGetItem(batchGetParams);

    if (batchGetRsp.isFailure()) {
      return Promise.reject(batchGetRsp);
    }

    let unprocessedKeys = batchGetRsp.data.UnprocessedKeys;
    if (Object.keys(unprocessedKeys).length > 0) {
      let unprocessedKeysLength = unprocessedKeys[oThis.shardName]['Keys'].length;
      logger.error(
        `batchGetItem getTransactions chainId : ${oThis.chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_by_tx_td_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    return Promise.resolve(responseHelper.successWithData(oThis._formatRowsFromDynamo(dbRows, 'transactionHash')));
  }
}

InstanceComposer.registerAsShadowableClass(TransactionDetailModel, coreConstants.icNameSpace, 'TransactionDetailModel');

module.exports = TransactionDetailModel;
