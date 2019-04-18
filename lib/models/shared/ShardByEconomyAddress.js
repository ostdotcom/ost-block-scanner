'use strict';
/**
 * Shard by economy address model
 *
 * @module lib/models/shared/ShardByEconomyAddress
 */
const rootPrefix = '../../..',
  helper = require(rootPrefix + '/helpers/basic'),
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');
require(rootPrefix + '/lib/cacheManagement/chainSpecific/AddressBasicDetails');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/AddressBalance');

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for shard by economy address model
 *
 * @constructor
 */
class ShardByEconomyAddressModel extends SharedBase {
  /**
   * Constructor for shard by economy address model
   *
   * @augments SharedBase
   *
   * @param {Object} params
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
      address: 'addr',
      economyIdentifier: 'eid',
      shardIdentifier: 'sid',
      blockNumber: 'bno',
      totalTransactionsOrTransfers: 'ttot'
    };
  }

  /**
   * Default short name to data type map
   *
   * @returns {Object}
   */
  get defaultShortNameToDataType() {
    return {
      addr: 'S',
      eid: 'S',
      sid: 'S',
      bno: 'N',
      ttot: 'N'
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
   * @returns {{addr: string, eid: string, sid: string}}
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
    return this.tablePrefix + 'shard_by_economy_addresses';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForAddress = oThis.shortNameFor('address'),
      shortNameForEconomyIdentifier = oThis.shortNameFor('economyIdentifier');

    return (
      'attribute_not_exists(' +
      shortNameForAddress +
      ') AND attribute_not_exists(' +
      shortNameForEconomyIdentifier +
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

    keyObj[oThis.shortNameFor('address')] = { S: params['address'].toString() };
    keyObj[oThis.shortNameFor('economyIdentifier')] = { S: params['economyIdentifier'].toString() };

    return keyObj;
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('economyIdentifier') + '.' + oThis.shortNameFor('totalTransactionsOrTransfers');
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
            AttributeName: oThis.shortNameFor('address'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('economyIdentifier'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('address'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('economyIdentifier'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('totalTransactionsOrTransfers'), AttributeType: 'N' }
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
                AttributeName: oThis.shortNameFor('economyIdentifier'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('totalTransactionsOrTransfers'),
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
   * Generate economy identifier
   *
   * @param {Number} chainId
   * @param {String} economyContractAddress
   *
   * @returns {String}
   */
  generateEconomyIdentifier(chainId, economyContractAddress) {
    return `${chainId}-${economyContractAddress.toLowerCase()}`;
  }

  /**
   * Get shard identifiers for given address for an economy contract addresses on a chain
   *
   * @param {Number} chainId
   * @param {String} economyContractAddress
   * @param {Array} addresses
   *
   * @returns {*|Promise<result>}
   */
  async getAddressesData(chainId, economyContractAddress, addresses) {
    const oThis = this;

    let getKeys = [],
      economyIdentifier = oThis.generateEconomyIdentifier(chainId, economyContractAddress),
      shortNameForEconomyIdentifier = oThis.shortNameFor('economyIdentifier'),
      shortNameForShardIdentifier = oThis.shortNameFor('shardIdentifier'),
      shortNameForAddress = oThis.shortNameFor('address'),
      shortNameForBlockNo = oThis.shortNameFor('blockNumber'),
      shortNameForTotalTrxs = oThis.shortNameFor('totalTransactionsOrTransfers'),
      dataTypeForEconomyIdentifier = oThis.shortNameToDataType[shortNameForEconomyIdentifier],
      dataTypeForShardIdentifier = oThis.shortNameToDataType[shortNameForShardIdentifier],
      dataTypeForBlockNo = oThis.shortNameToDataType[shortNameForBlockNo],
      dataTypeForAddress = oThis.shortNameToDataType[shortNameForAddress],
      dataTypeForTotalTrxs = oThis.shortNameToDataType[shortNameForTotalTrxs],
      economyContractAddrShardIdentifierMap = {};

    for (let i = 0; i < addresses.length; i++) {
      let buffer = {};
      buffer[shortNameForEconomyIdentifier] = {};
      buffer[shortNameForEconomyIdentifier][dataTypeForEconomyIdentifier] = economyIdentifier;
      buffer[shortNameForAddress] = {};
      buffer[shortNameForAddress][dataTypeForAddress] = addresses[i].toLowerCase();
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
        `batchGetItem getShardIdentifiersByEconomy chainId : ${chainId} UnprocessedKeys : ${unprocessedKeysLength}`
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbea_1',
          api_error_identifier: 'ddb_batch_get_failed',
          debug_options: { unProcessedCount: unprocessedKeysLength }
        })
      );
    }

    let dbRows = batchGetRsp.data.Responses[oThis.tableName()];

    for (let i = 0; i < dbRows.length; i++) {
      let totalTransfers = dbRows[i][shortNameForTotalTrxs]
        ? dbRows[i][shortNameForTotalTrxs][dataTypeForTotalTrxs]
        : 0;
      economyContractAddrShardIdentifierMap[dbRows[i][shortNameForAddress][dataTypeForAddress]] = {
        shardIdentifier: dbRows[i][shortNameForShardIdentifier][dataTypeForShardIdentifier],
        createdInBlock: dbRows[i][shortNameForBlockNo][dataTypeForBlockNo],
        totalTransactionsOrTransfers: totalTransfers
      };
    }

    return Promise.resolve(responseHelper.successWithData(economyContractAddrShardIdentifierMap));
  }

  /**
   * This function will give all the details present in database related to address passed.
   *
   * @param {String} address
   *
   * @returns {Promise<>}
   */
  async fetchAddressDetails(address) {
    const oThis = this;

    if (!helper.isAddressValid(address)) {
      logger.error('Invalid Address passed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_m_s_sbea_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let dataTypeOfAddress = oThis.shortNameToDataType[oThis.longToShortNamesMap['address']],
      expressionAttributeValue = {};

    expressionAttributeValue[dataTypeOfAddress] = address.toString().toLowerCase();

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${oThis.longToShortNamesMap['address']} = :b`,
      ExpressionAttributeValues: {
        ':b': expressionAttributeValue
      }
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
      shortNameForAddress = oThis.longToShortNamesMap['address'],
      dataTypeForAddress = oThis.shortNameToDataType[shortNameForAddress],
      shortNameForEconomyIdentifier = oThis.longToShortNamesMap['economyIdentifier'],
      dataTypeForEconomyIdentifier = oThis.shortNameToDataType[shortNameForEconomyIdentifier];

    let responseArray = [];
    for (let index in dbRows) {
      let dbRow = dbRows[index];
      responseArray[index] = {};
      responseArray[index]['address'] = dbRow[shortNameForAddress][dataTypeForAddress];
      let economyIdentifier = dbRow[shortNameForEconomyIdentifier][dataTypeForEconomyIdentifier],
        splitString = economyIdentifier.split('-');
      responseArray[index]['chainId'] = splitString[0];
      responseArray[index]['contractAddress'] = splitString[1];
    }

    return responseArray;
  }

  /**
   * Split Economy identifier
   *
   * @param {String} identifier
   *
   * @returns {{transactionHash: (*|String), eventIndex: (*|String)}}
   */
  _splitEconomyIdentifier(identifier) {
    const buffer = identifier.split('-');

    return {
      economyAddress: buffer[1],
      chainId: buffer[0]
    };
  }

  /**
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache(updatedRow) {
    const oThis = this;

    // Clear shard identifier address entity cache.
    let promisesArr = [],
      splitResponse = oThis._splitEconomyIdentifier(updatedRow.economyIdentifier),
      cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
      cacheObj = new cacheKlass({
        economyContractAddress: splitResponse.economyAddress,
        addresses: [updatedRow.address],
        chainId: splitResponse.chainId,
        consistentRead: 1
      });

    promisesArr.push(cacheObj.clear());

    // Clear address basic details cache
    let addrBasicCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBasicDetailsCache'),
      addrBasicCacheObj = new addrBasicCacheKlass({
        address: updatedRow.address,
        chainId: splitResponse.chainId
      });

    promisesArr.push(addrBasicCacheObj.clear());

    // Clear address balance cache
    let addrBalanceCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddressBalanceCache'),
      addrBalanceCacheObj = new addrBalanceCacheKlass({
        economyContractAddress: splitResponse.economyAddress,
        addresses: [updatedRow.address],
        chainId: splitResponse.chainId
      });

    promisesArr.push(addrBalanceCacheObj.clear());

    await Promise.all(promisesArr);
  }

  /**
   * Things to do after Update or Put Item in DB
   *
   * @param updatedData
   * @returns {Promise<*>}
   */
  async afterUpdate(updatedData) {
    const oThis = this;

    await oThis.clearCache(updatedData);
  }
}

InstanceComposer.registerAsShadowableClass(
  ShardByEconomyAddressModel,
  coreConstants.icNameSpace,
  'ShardByEconomyAddressModel'
);

module.exports = ShardByEconomyAddressModel;
