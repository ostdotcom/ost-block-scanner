'use strict';
/**
 * Block Detail Model
 *
 * @module lib/models/sharded/byBlock/BlockDetail
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

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for block details model
 *
 * @class
 */
class BlockDetailModel extends ShardedBase {
  /**
   * Constructor for block details model
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
    oThis.shardByBlockShardIdentifier = params.shardIdentifier;
  }

  /**
   * Default Long to short name map.
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      chainId: 'cid',
      blockNumber: 'bno',
      parentBlockHash: 'pbh',
      gasUsed: 'gu',
      difficulty: 'df',
      extraData: 'ed',
      miner: 'mn',
      nonce: 'nn',
      stateRoot: 'str',
      receiptsRoot: 'rr',
      transactionsRoot: 'txr',
      sha3Uncles: 'shu',
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
      bno: 'N',
      pbh: 'S',
      df: 'S',
      ed: 'S',
      mn: 'S',
      nn: 'S',
      str: 'S',
      rr: 'S',
      txr: 'S',
      shu: 'S',
      uts: 'N'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {Object}
   * */
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
    return 'blockDetails';
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return '{{shardByBlockShardIdentifier}}_block_details';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {{shardByTransactionShardIdentifier: *}}
   */
  tableNameTemplateVars() {
    const oThis = this;

    return {
      shardByBlockShardIdentifier: oThis.shardByBlockShardIdentifier
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
      shortNameForBlockNumber = oThis.shortNameFor('blockNumber');

    return (
      'attribute_not_exists(' + shortNameForChainId + ') AND attribute_not_exists(' + shortNameForBlockNumber + ')'
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

    keyObj[oThis.shortNameFor('chainId')] = { N: params['chainId'].toString() };
    keyObj[oThis.shortNameFor('blockNumber')] = { N: params['blockNumber'].toString() };

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
            AttributeName: oThis.shortNameFor('blockNumber'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('chainId'), AttributeType: 'N' },
          { AttributeName: oThis.shortNameFor('blockNumber'), AttributeType: 'N' }
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
   * getBlockDetailsExtended - Get details from block details table
   *
   */
  async getBlockDetailsExtended(blockNumbers) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForBlockNumber = oThis.shortNameFor('blockNumber'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForBlockNumber = oThis.shortNameToDataType[shortNameForBlockNumber];

    for (let i = 0; i < blockNumbers.length; i++) {
      let buffer = {};
      buffer[shortNameForChainId] = { [dataTypeForChainId]: oThis.chainId.toString() };
      buffer[shortNameForBlockNumber] = { [dataTypeForBlockNumber]: blockNumbers[i].toString() };
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
        `batchGetItem getBlockDetailsExtended chainId : ${oThis.chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_by_bd_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()],
      formatterResponse = oThis._formatRowsFromDynamo(dbRows, 'blockNumber'); // Primary key here should be the blockNumber.

    return Promise.resolve(responseHelper.successWithData(formatterResponse));
  }

  /**
   * Clear caches.
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

InstanceComposer.registerAsShadowableClass(BlockDetailModel, coreConstants.icNameSpace, 'BlockDetailModel');

module.exports = BlockDetailModel;
