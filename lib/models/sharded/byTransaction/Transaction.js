'use strict';
/**
 * Transaction Model
 *
 * @module lib/models/sharded/byTransaction/Transaction
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
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/Transaction');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for transaction model
 *
 * @class
 */
class TransactionModel extends ShardedBase {
  /**
   * Constructor for transaction model
   *
   * @augments ShardedBase
   *
   * @param {Object} params: params for the constructor
   * @param {Number} params.chainId: chainId
   * @param {String} params.shardIdentifier: shardIdentifier
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
   * List of properties required to be JSON parsed in response.
   *
   * @returns {Object}
   */
  get propertiesToParse() {
    return {
      transactionTransferIndices: 'tti'
    };
  }

  /**
   * Default Long to short name map.
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      chainId: 'cid',
      transactionUuid: 'txuuid',
      transactionHash: 'txh',
      blockNumber: 'bno',
      transactionIndex: 'txid',
      fromAddress: 'fad',
      toAddress: 'tad',
      contractAddress: 'cad',
      value: 'val',
      gasUsed: 'gu',
      gasPrice: 'gp',
      gasLimit: 'gl',
      nonce: 'nn',
      transfers: 'trs',
      blockTimestamp: 'bts',
      transactionStatus: 'tst',
      transactionInternalStatus: 'tist',
      totalTokenTransfers: 'ttt',
      eventsParsingStatus: 'eps',
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
      txuuid: 'S',
      txh: 'S',
      bno: 'N',
      txid: 'N',
      fad: 'S',
      tad: 'S',
      cad: 'S',
      val: 'S',
      gu: 'N',
      gp: 'N',
      gl: 'N',
      nn: 'N',
      trs: 'S',
      bts: 'N',
      tst: 'S',
      tist: 'S',
      ttt: 'N',
      eps: 'N',
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
   * @returns {{cid: string, txh: string, bno: string, txid: string, fad: string, tad: string, val: string, gu: string, gp: string, nn: string, ip: string, lg: string, r: string, s: string, v: string, bts: string, tst: string, tist: string, uts: string}}
   */
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
    return 'transactions';
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return '{{shardByTransactionShardIdentifier}}_transactions';
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
    const oThis = this;

    const tableSchema = {
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
   * Clear caches.
   *
   * @returns {Promise<void>}
   */
  async clearCache(updatedRow) {
    const oThis = this,
      cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TransactionCache'),
      cacheObj = new cacheKlass({
        chainId: updatedRow.chainId,
        transactionHashes: [updatedRow.transactionHash]
      });

    cacheObj.clear();
  }

  /**
   * Things to do after update - like clear cache etc.
   *
   * @returns {Promise<void>}
   */
  async afterUpdate(updatedRow) {
    const oThis = this;

    await oThis.clearCache(updatedRow);
  }

  /**
   * Get transactions of a chain.
   *
   * @param {Array} transactionHashes
   * @returns {*|Promise<result>}
   */
  async getTransactions(transactionHashes) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForTransactionHash = oThis.shortNameFor('transactionHash'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForTransactionHash = oThis.shortNameToDataType[shortNameForTransactionHash];

    for (let i = 0; i < transactionHashes.length; i++) {
      let buffer = {};
      buffer[shortNameForChainId] = { [dataTypeForChainId]: oThis.chainId.toString() };
      buffer[shortNameForTransactionHash] = { [dataTypeForTransactionHash]: transactionHashes[i].toLowerCase() };
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
        `batchGetItem getTransactions chainId : ${oThis.chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_by_tx_t_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    return Promise.resolve(responseHelper.successWithData(oThis._formatRowsFromDynamo(dbRows, 'transactionHash')));
  }
}

InstanceComposer.registerAsShadowableClass(TransactionModel, coreConstants.icNameSpace, 'TransactionModel');

module.exports = TransactionModel;
