'use strict';
/**
 * Model for blocks table
 *
 * @module lib/models/sharded/byBlock/Block
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
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for block model
 *
 * @class
 */
class BlockModel extends ShardedBase {
  /**
   * Constructor for block model
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
    oThis.shardByBlockShardIdentifier = params.shardIdentifier;
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      chainId: 'cid',
      blockNumber: 'bno',
      blockHash: 'bh',
      gasUsed: 'gu',
      totalTransactions: 'ttx',
      blockTimestamp: 'bts',
      size: 'sz',
      isFinal: 'isf',
      updatedTimestamp: 'uts'
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
      bno: 'N',
      bh: 'S',
      gu: 'N',
      ttx: 'N',
      bts: 'N',
      sz: 'N',
      isf: 'BOOL',
      uts: 'N'
    };
  }

  /**
   * It should return the table name identifier. This is a human readable name determining the entity stored in the table.
   *
   * @returns {String}
   */
  tableIdentifier() {
    return 'blocks';
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
   * @returns {{cid: string, bno: string, bh: string, pbh: string, gl: string, gu: string, ttx: string, bts: string, df: string, ed: string, mn: string, nn: string, str: string, rr: string, txr: string, sz: string, shu: string, isf: string, cts: string, uts: string}}
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
    return '{{shardByBlockShardIdentifier}}_blocks';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {Object}
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

    keyObj[oThis.shortNameFor('blockNumber')] = { N: params['blockNumber'].toString() };
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
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache(updatedRow) {
    const oThis = this,
      cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockDataByBlockNoCache'),
      cacheObj = new cacheKlass({
        chainId: updatedRow.chainId,
        blockNumbers: [updatedRow.blockNumber]
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

  async getBlockDetails(blockNumbers) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForBlockNumber = oThis.shortNameFor('blockNumber'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForBlockNumber = oThis.shortNameToDataType[shortNameForBlockNumber],
      blockNumberToBlockTimestampMap = {};

    for (let i = 0; i < blockNumbers.length; i++) {
      let buffer = {};
      buffer[shortNameForChainId] = { [dataTypeForChainId]: oThis.chainId.toString() };
      buffer[shortNameForBlockNumber] = { [dataTypeForBlockNumber]: blockNumbers[i].toString() };
      getKeys.push(buffer);
      blockNumberToBlockTimestampMap[blockNumbers[i]] = {};
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
        `batchGetItem getBlockTimestamp chainId : ${oThis.chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_by_b_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()],
      formatterResponse = oThis._formatRowsFromDynamo(dbRows, 'blockNumber'); // Primary key here should be the blockNumber.

    return Promise.resolve(responseHelper.successWithData(formatterResponse));
  }
}

InstanceComposer.registerAsShadowableClass(BlockModel, coreConstants.icNameSpace, 'BlockModel');

module.exports = BlockModel;
