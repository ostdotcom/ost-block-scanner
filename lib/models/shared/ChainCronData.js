'use strict';
/**
 * ChainCronData model - manages extra data for a chain
 *
 * @module lib/models/shared/ChainCronData.js
 */
const rootPrefix = '../../..',
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

let longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for chain model
 *
 * @class
 */
class ChainCronDataModel extends SharedBase {
  /**
   * Constructor for ChainCronDataModel model
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
      chainId: 'cid',
      lastFinalizedBlock: 'lfb',
      lastAggregatedBlock: 'lab'
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
      lfb: 'N',
      lab: 'N'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{chainId: string, networkId: string}}
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
   * @returns {{cid: string, nid: string}}
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
    return this.tablePrefix + 'chain_cron_data';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId');

    return 'attribute_not_exists(' + shortNameForChainId + ')';
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
          }
        ],
        AttributeDefinitions: [{ AttributeName: oThis.shortNameFor('chainId'), AttributeType: 'N' }],
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
   * This method returns whether the chainId exists or not in the table.
   *
   * @param {Number} chainId
   *
   * @returns {Promise<*>}
   */
  async checkIfChainIdExists(chainId) {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId');

    const queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForChainId} = :ci`,
      ExpressionAttributeValues: {
        ':ci': { N: chainId.toString() }
      }
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return response;
    }

    if (response.data.Count === 1) {
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }
  }

  /**
   * This method returns cron data for a particular chain
   *
   * @param {Number} chainId
   *
   * @returns {Promise<*>}
   */
  async getCronData(chainId) {
    const oThis = this,
      shortNameForChainId = oThis.shortNameFor('chainId');

    const queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForChainId} = :ci`,
      ExpressionAttributeValues: {
        ':ci': { N: chainId.toString() }
      }
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return response;
    }

    let dbrows = response.data.Items;

    let formattedData = oThis._formatRowsFromDynamo(dbrows, 'chainId');

    return formattedData;
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
}

InstanceComposer.registerAsShadowableClass(ChainCronDataModel, coreConstants.icNameSpace, 'ChainCronDataModel');

module.exports = ChainCronDataModel;
