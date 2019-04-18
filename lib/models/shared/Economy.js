'use strict';
/**
 * Economy model
 *
 * @module lib/models/shared/Economy
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/shared/Economy');

const PAGESIZE = 10;

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for economy model
 *
 * @class
 */
class EconomyModel extends SharedBase {
  /**
   * Constructor for economy model
   *
   * @augments SharedBase
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.pageSize = PAGESIZE;
  }

  /**
   * Default Long to short name map
   *
   * @returns {Object}
   */
  get defaultLongToShortNamesMap() {
    return {
      contractAddress: 'ca',
      chainId: 'cid',
      name: 'nam',
      symbol: 'symb',
      totalSupply: 'tts',
      decimals: 'dc',
      sortEconomyBy: 'seb',
      marketCap: 'mc',
      conversionFactor: 'cf',
      displayName: 'dnam',
      displaySymbol: 'dsymb',
      totalTokenHolders: 'tth',
      totalTokenTransfers: 'ttt',
      totalVolume: 'tv',
      balanceMaintainSupport: 'bms',
      createdTimestamp: 'cts',
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
      ca: 'S',
      cid: 'N',
      nam: 'S',
      symb: 'S',
      tts: 'N',
      seb: 'N',
      dc: 'N',
      uts: 'N',
      cts: 'N',
      cf: 'N',
      mc: 'N',
      dnam: 'S',
      dsymb: 'S',
      tth: 'N',
      ttt: 'N',
      tv: 'N',
      bms: 'BOOL'
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
   * @returns {{ca: string, cid: string, name: string, symb: string, ts: string, cts: string, uts: string}}
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
    return this.tablePrefix + 'economies';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForContractAddress = oThis.shortNameFor('contractAddress');

    return (
      'attribute_not_exists(' + shortNameForContractAddress + ') AND attribute_not_exists(' + shortNameForChainId + ')'
    );
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('sortEconomyBy') + '.' + oThis.shortNameFor('name');
  }

  /**
   * Returns the second global secondary index name.
   *
   * @returns {String}
   */
  secondGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('sortEconomyBy') + '.' + oThis.shortNameFor('symbol');
  }

  /**
   * Returns the third global secondary index name.
   *
   * @returns {String}
   */
  thirdGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('sortEconomyBy') + '.' + oThis.shortNameFor('marketCap');
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

    keyObj[oThis.shortNameFor('contractAddress')] = { S: params['contractAddress'].toString() };
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
            AttributeName: oThis.shortNameFor('contractAddress'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('chainId'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          {
            AttributeName: oThis.shortNameFor('contractAddress'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('chainId'),
            AttributeType: 'N'
          },
          {
            AttributeName: oThis.shortNameFor('sortEconomyBy'),
            AttributeType: 'N'
          },
          {
            AttributeName: oThis.shortNameFor('name'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('symbol'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('marketCap'),
            AttributeType: 'N'
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
                AttributeName: oThis.shortNameFor('sortEconomyBy'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('name'),
                KeyType: 'RANGE'
              } //Sort Key
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
                AttributeName: oThis.shortNameFor('sortEconomyBy'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('symbol'),
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
                AttributeName: oThis.shortNameFor('sortEconomyBy'),
                KeyType: 'HASH'
              },
              {
                AttributeName: oThis.shortNameFor('marketCap'),
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
   * Multi Get Economies data
   *
   * @param {Hash} chainIdToContractAddressesMap
   *
   * @returns {*|Promise<result>}
   */
  async multiGetEconomiesData(chainIdToContractAddressesMap) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForContractAddress = oThis.shortNameFor('contractAddress'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForContractHash = oThis.shortNameToDataType[shortNameForContractAddress];

    for (let chainId in chainIdToContractAddressesMap) {
      for (let index = 0; index < chainIdToContractAddressesMap[chainId].length; index++) {
        let contractAddressesArray = chainIdToContractAddressesMap[chainId],
          buffer = {};
        buffer[shortNameForContractAddress] = {};
        buffer[shortNameForContractAddress][dataTypeForContractHash] = contractAddressesArray[index].toLowerCase();
        buffer[shortNameForChainId] = {};
        buffer[shortNameForChainId][dataTypeForChainId] = chainId.toString();
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

    return Promise.resolve(
      responseHelper.successWithData(oThis._customFormatRowFromDynamoDb(dbRows, 'chainId', 'contractAddress'))
    );
  }

  /**
   * Get economy details
   *
   * @param {Number} chainId
   * @param {Array} economyContractAddresses
   *
   * @returns {*|Promise<result>}
   */
  async getEconomyData(chainId, economyContractAddresses) {
    const oThis = this;

    let getKeys = [],
      shortNameForChainId = oThis.shortNameFor('chainId'),
      shortNameForContractAddress = oThis.shortNameFor('contractAddress'),
      dataTypeForChainId = oThis.shortNameToDataType[shortNameForChainId],
      dataTypeForContractHash = oThis.shortNameToDataType[shortNameForContractAddress];

    for (let i = 0; i < economyContractAddresses.length; i++) {
      let buffer = {};
      buffer[shortNameForContractAddress] = {};
      buffer[shortNameForContractAddress][dataTypeForContractHash] = economyContractAddresses[i].toLowerCase();
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

    let formattedData = oThis._formatRowsFromDynamo(dbRows, 'contractAddress');

    return Promise.resolve(responseHelper.successWithData(formattedData));
  }

  /**
   * This function performs a search on token name and token symbol
   *
   * @param {String} keyword
   *
   * @returns {Promise<any>}
   */
  async searchByNameOrSymbol(keyword) {
    const oThis = this;

    let shortNameOfSortEconomyBy = oThis.longToShortNamesMap['sortEconomyBy'],
      dataTypeOfSortEconomyBy = oThis.shortNameToDataType[shortNameOfSortEconomyBy],
      defaultValueOfSortEconomyBy = '1',
      shortNameOfTokenName = oThis.longToShortNamesMap['name'],
      dataTypeOfTokenName = oThis.shortNameToDataType[shortNameOfTokenName],
      shortNameOfTokenSymbol = oThis.longToShortNamesMap['symbol'],
      dataTypeOfTokenSymbol = oThis.shortNameToDataType[shortNameOfTokenSymbol],
      formattedKeyword = keyword.toString().toLowerCase();

    let tokenNameQueryParams = {
        TableName: oThis.tableName(),
        IndexName: oThis.firstGlobalSecondaryIndexName(),
        KeyConditionExpression: '#sortEconomyBy = :sortEconomyBy AND begins_with(#tokenName, :tokenName)',
        ExpressionAttributeNames: {
          '#sortEconomyBy': shortNameOfSortEconomyBy,
          '#tokenName': shortNameOfTokenName
        },
        ExpressionAttributeValues: {
          ':sortEconomyBy': { [dataTypeOfSortEconomyBy]: defaultValueOfSortEconomyBy },
          ':tokenName': { [dataTypeOfTokenName]: formattedKeyword }
        },
        Limit: oThis.pageSize,
        ScanIndexForward: false
      },
      tokenSymbolQueryParams = {
        TableName: oThis.tableName(),
        IndexName: oThis.secondGlobalSecondaryIndexName(),
        KeyConditionExpression: '#sortEconomyBy = :sortEconomyBy AND begins_with(#tokenSymbol, :tokenSymbol)',
        ExpressionAttributeNames: {
          '#sortEconomyBy': shortNameOfSortEconomyBy,
          '#tokenSymbol': shortNameOfTokenSymbol
        },
        ExpressionAttributeValues: {
          ':sortEconomyBy': { [dataTypeOfSortEconomyBy]: defaultValueOfSortEconomyBy },
          ':tokenSymbol': { [dataTypeOfTokenSymbol]: formattedKeyword }
        },
        Limit: oThis.pageSize,
        ScanIndexForward: false
      },
      promiseArray = [];

    promiseArray.push(oThis.ddbServiceObj.query(tokenNameQueryParams));
    promiseArray.push(oThis.ddbServiceObj.query(tokenSymbolQueryParams));

    let queryResponse = await Promise.all(promiseArray),
      formattedResponse = await oThis._fetchCompleteDataOfToken(queryResponse);

    return Promise.resolve(responseHelper.successWithData(formattedResponse));
  }

  /**
   * This function merges responses from both queries(token symbol and token name)
   *
   * @param queryResponses
   *
   * @returns {Array}
   *
   * @private
   */
  async _fetchCompleteDataOfToken(queryResponses) {
    const oThis = this;

    let shortNameOfChainId = oThis.longToShortNamesMap['chainId'],
      dataTypeOfChainId = oThis.shortNameToDataType[shortNameOfChainId],
      shortNameOfContractAddr = oThis.longToShortNamesMap['contractAddress'],
      dataTypeOfContractAddr = oThis.shortNameToDataType[shortNameOfContractAddr],
      promiseArray = [],
      contractAddresses = {},
      chainIdToContractAddressesHash = {};

    for (let index in queryResponses) {
      let queryResponse = queryResponses[index];

      if (queryResponse.isFailure()) {
        // even if a query fails, skip this result and consider responses of other query
        continue;
      }

      let dbRows = queryResponse.data.Items;

      for (let i in dbRows) {
        let dbRow = dbRows[i],
          contractAddress = dbRow[shortNameOfContractAddr][dataTypeOfContractAddr],
          chainId = dbRow[shortNameOfChainId][dataTypeOfChainId];

        if (!contractAddresses[contractAddress]) {
          contractAddresses[contractAddress] = chainId;
          chainIdToContractAddressesHash[chainId] = chainIdToContractAddressesHash[chainId]
            ? chainIdToContractAddressesHash[chainId]
            : [];
          chainIdToContractAddressesHash[chainId].push(contractAddress);
        }
      }
    }

    for (let chainId in chainIdToContractAddressesHash) {
      promiseArray.push(oThis.getEconomyData(chainId, chainIdToContractAddressesHash[chainId]));
    }
    let responsesArray = await Promise.all(promiseArray);

    return oThis._formatSearchResponse(responsesArray);
  }

  /**
   * Return array of search results
   *
   * @param responsesArray
   *
   * @returns {any[]}
   *
   * @private
   */
  _formatSearchResponse(responsesArray) {
    let contractAddressToDetailMap = {};

    for (let index in responsesArray) {
      Object.assign(contractAddressToDetailMap, responsesArray[index].data);
    }

    return Object.values(contractAddressToDetailMap);
  }

  /**
   * Clear caches
   *
   * @returns {Promise<void>}
   */
  async clearCache(updatedRow) {
    const oThis = this,
      economyCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache'),
      cacheObj = new economyCacheKlass({
        chainId: updatedRow.chainId,
        economyContractAddresses: [updatedRow.contractAddress]
      });

    await cacheObj.clear();
  }

  /**
   * Set Cache of Economy Data
   *
   * @param dbResponse
   * @returns {Promise<void>}
   */
  async setCache(dbResponse) {
    const oThis = this,
      cacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyCache'),
      cacheObj = new cacheKlass({
        chainId: dbResponse.chainId,
        economyContractAddresses: [dbResponse.contractAddress]
      });

    await cacheObj.setCache(dbResponse.contractAddress, dbResponse);
  }

  /**
   * Things to do after Update or Put Item in DB
   *
   * @param updatedData
   * @returns {Promise<*>}
   */
  async afterUpdate(updatedData) {
    const oThis = this;

    const formattedResponse = oThis._formatRowFromDynamo(updatedData);

    await oThis.setCache(formattedResponse);
  }
}

InstanceComposer.registerAsShadowableClass(EconomyModel, coreConstants.icNameSpace, 'EconomyModel');

module.exports = EconomyModel;
