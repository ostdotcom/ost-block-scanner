'use strict';
/**
 * Shard by block model
 *
 * @module lib/models/shared/ShardByBlock
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/shared/HighestBlockNo');

let longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for shard by block model
 *
 * @class
 */
class ShardByBlockModel extends SharedBase {
  /**
   * Constructor for shard by block model
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

    oThis.pageSize = params.pageSize || paginationLimits.recentBlocksLimit;
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
      blockHash: 'bkh',
      shardIdentifier: 'sid'
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
      bkh: 'S',
      sid: 'S'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{chainId: string, blockNumber: string, blockHash: string, shardIdentifier: string}}
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
   * @returns {{cid: string, bno: string, bkh: string, sid: string}}
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
    return this.tablePrefix + 'shard_by_blocks';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForBlockNumber = oThis.shortNameFor('blockNumber'),
      shortNameForBlockHash = oThis.shortNameFor('blockHash');

    return (
      'attribute_not_exists(' +
      shortNameForChainId +
      ') AND attribute_not_exists(' +
      shortNameForBlockNumber +
      ') AND attribute_not_exists(' +
      shortNameForBlockHash +
      ')'
    );
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('blockNumber');
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
          }, //Partition key
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
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: oThis.firstGlobalSecondaryIndexName(),
            KeySchema: [
              {
                AttributeName: oThis.shortNameFor('blockNumber'),
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
   * Get shard identifiers for given block numbers for a chain
   *
   * @param {Number} chainId
   * @param {Array} blockNumbers
   *
   * @returns {*|Promise<result>}
   */
  async getShardIdentifiers(chainId, blockNumbers) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForBlockNumber = oThis.shortNameFor('blockNumber'),
      shortNameForShardIdentifier = oThis.shortNameFor('shardIdentifier'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForBlockNumber = oThis.shortNameToDataType[shortNameForBlockNumber],
      dataTypeForShardIdentifier = oThis.shortNameToDataType[shortNameForShardIdentifier],
      blockNumberShardIdentifierMap = {};

    for (let i = 0; i < blockNumbers.length; i++) {
      let buffer = {};
      buffer[shortNameForBlockNumber] = {};
      buffer[shortNameForBlockNumber][dataTypeForBlockNumber] = blockNumbers[i].toString();
      buffer[shortNameForChainId] = {};
      buffer[shortNameForChainId][dataTypeForChainId] = chainId.toString();
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
          internal_error_identifier: 'l_m_s_sbb_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    for (let i = 0; i < dbRows.length; i++) {
      blockNumberShardIdentifierMap[dbRows[i][shortNameForBlockNumber][dataTypeForBlockNumber]] = {
        shardIdentifier: dbRows[i][shortNameForShardIdentifier][dataTypeForShardIdentifier]
      };
    }

    return Promise.resolve(responseHelper.successWithData(blockNumberShardIdentifierMap));
  }

  /**
   * Get highest block for a particular chain
   *
   * @param {Number} chainId
   *
   * @returns {*|Promise<result>}
   */
  async getHighestBlock(chainId) {
    const oThis = this;

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: 'cid = :c',
      ExpressionAttributeValues: {
        ':c': { N: chainId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('blockNumber'),
      Limit: 1,
      ScanIndexForward: false,
      ConsistentRead: oThis.consistentRead
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    if (!response.data.Items || !response.data.Items[0]) {
      // when table has no rows for chain id return 0 as highest block
      return Promise.resolve(responseHelper.successWithData({ highestBlock: -1 }));
    }

    return Promise.resolve(
      responseHelper.successWithData({
        highestBlock: parseInt(response.data.Items[0][oThis.shortNameFor('blockNumber')].N)
      })
    );
  }

  /**
   * Get highest block for a particular chain
   *
   * @param {Number} chainId
   * @param {String} LastEvaluatedKey
   *
   * @returns {*|Promise<result>}
   */
  async getRecentBlocks(chainId, LastEvaluatedKey) {
    const oThis = this;

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: 'cid = :c',
      ExpressionAttributeValues: {
        ':c': { N: chainId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('blockNumber'),
      Limit: oThis.pageSize,
      ScanIndexForward: false,
      ConsistentRead: oThis.consistentRead
    };

    if (LastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = LastEvaluatedKey;
    }

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    if (!response.data.Items || !response.data.Items[0]) {
      // When table has no rows for chainId, return empty array of blocks.
      return Promise.resolve(responseHelper.successWithData({ blocks: [] }));
    }

    let blocks = response.data.Items,
      responseBlocks = [];

    // Get all the blocks.
    for (let index = 0; index < blocks.length; index++) {
      responseBlocks.push(parseInt(blocks[index][oThis.shortNameFor('blockNumber')].N));
    }

    return Promise.resolve(
      responseHelper.successWithData({
        blocks: responseBlocks,
        nextPagePayload: { LastEvaluatedKey: response.data.LastEvaluatedKey }
      })
    );
  }

  /**
   * This function gives an array of all chain ids where the given block number exists
   *
   * @param {Number} blockNumber: Block number
   *
   * @returns {Promise<Hash>} Hash indexed by block number whose value is an array of chain ids where the given block number was present
   */
  async getChainIds(blockNumber) {
    const oThis = this,
      blockNumberShortName = oThis.shortNameFor('blockNumber');

    let expressionAttributeValues = {};
    expressionAttributeValues[oThis.shortNameToDataType[blockNumberShortName].toString()] = blockNumber.toString();

    let queryParams = {
      TableName: oThis.tableName(),
      IndexName: oThis.firstGlobalSecondaryIndexName(),
      KeyConditionExpression: `${blockNumberShortName} = :b`,
      ExpressionAttributeValues: {
        ':b': expressionAttributeValues
      },
      ScanIndexForward: false
    };

    let queryResponse = await oThis.ddbServiceObj.query(queryParams);

    if (queryResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbb_2',
          api_error_identifier: 'ddb_request_failed'
        })
      );
    }

    // Following formatter gives the response in the form of an hash indexed by chain id.
    // All the keys of the formatted hash will give all the chainIds where the given block number exists
    let dbRows = queryResponse.data.Items,
      formattedResponse = oThis._formatRowsFromDynamo(dbRows, 'chainId'),
      dataToReturn = {};

    dataToReturn[blockNumber] = Object.keys(formattedResponse);

    return Promise.resolve(responseHelper.successWithData(dataToReturn));
  }

  /**
   * Returns the blockNumber
   *
   * @param {Object} params
   * @returns {Promise<*|promise<result>>}
   */
  async getBlock(params) {
    const oThis = this;

    let batchGetParams = { RequestItems: {} };

    batchGetParams.RequestItems[oThis.tableName()] = {
      Keys: [oThis._keyObj(params)],
      ConsistentRead: oThis.consistentRead
    };

    let response = await oThis.ddbServiceObj.batchGetItem(batchGetParams, 1);

    let data = response.data.Responses[oThis.tableName()][0];

    return responseHelper.successWithData(oThis._formatRowFromDynamo(data));
  }

  /**
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache(updatedRow) {
    const oThis = this,
      HighestBlockNoCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'HighestBlockNoCache'),
      highestBlockNoCache = new HighestBlockNoCache({ chainId: updatedRow.chainId });

    await highestBlockNoCache.clear();
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
}

InstanceComposer.registerAsShadowableClass(ShardByBlockModel, coreConstants.icNameSpace, 'ShardByBlockModel');

module.exports = ShardByBlockModel;
