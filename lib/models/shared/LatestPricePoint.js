'use strict';
/**
 * Latest price point model.
 *
 * @module lib/models/shared/LatestPricePoint
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  SharedBase = require(rootPrefix + '/lib/models/shared/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer

let _longToShortNamesMap = null,
  shortNameToDataType = null,
  shortToLongNamesMap = null;

/**
 * Class for latest price point model.
 *
 * @class LatestPricePointModel
 */
class LatestPricePointModel extends SharedBase {
  /**
   * Constructor for latest price point model.
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
      baseCurrency: 'bc',
      quoteCurrency: 'qc',
      pricePoint: 'pp',
      decimal: 'dcm',
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
      bc: 'S',
      qc: 'S',
      pp: 'N',
      dcm: 'N',
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
    return this.tablePrefix + 'latest_price_points';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForBaseCurrency = oThis.shortNameFor('baseCurrency'),
      shortNameForQuoteCurrency = oThis.shortNameFor('quoteCurrency');

    return (
      'attribute_not_exists(' +
      shortNameForBaseCurrency +
      ') AND attribute_not_exists(' +
      shortNameForQuoteCurrency +
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

    return oThis.shortNameFor('baseCurrency') + '.' + oThis.shortNameFor('quoteCurrency');
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

    keyObj[oThis.shortNameFor('baseCurrency')] = { S: params['baseCurrency'].toString() };
    keyObj[oThis.shortNameFor('quoteCurrency')] = { S: params['quoteCurrency'].toString() };

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
            AttributeName: oThis.shortNameFor('baseCurrency'),
            KeyType: 'HASH'
          }, // Partition key
          {
            AttributeName: oThis.shortNameFor('quoteCurrency'),
            KeyType: 'RANGE'
          } // Sort key
        ],
        AttributeDefinitions: [
          {
            AttributeName: oThis.shortNameFor('baseCurrency'),
            AttributeType: 'S'
          },
          {
            AttributeName: oThis.shortNameFor('quoteCurrency'),
            AttributeType: 'S'
          }
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
   * Get price points.
   *
   * @returns {Promise<result>}
   */
  async getPricePoints() {
    const oThis = this;

    const scanParams = {
      TableName: oThis.tableName(),
      ConsistentRead: false
    };

    const response = await oThis.ddbServiceObj.scan(scanParams);

    if (response.isFailure()) {
      return response;
    }

    const finalResponse = {};

    for (let i = 0; i < response.data.Items.length; i++) {
      let formattedRow = oThis._formatRowFromDynamo(response.data.Items[i]);
      finalResponse[formattedRow.baseCurrency] = finalResponse[formattedRow.baseCurrency] || {};
      finalResponse[formattedRow.baseCurrency][formattedRow.quoteCurrency] = formattedRow.pricePoint;
      finalResponse[formattedRow.baseCurrency]['decimals'] = formattedRow.decimal;
    }

    return responseHelper.successWithData(finalResponse);
  }

  /**
   * Update price points.
   *
   * @param params
   * @param {String} params.baseCurrency
   * @param {String} params.quoteCurrency
   * @param {String} params.pricePoint
   * @param {Number} params.decimal
   *
   * @returns {Promise<*>}
   */
  async updatePricePoints(params) {
    const oThis = this;

    const updateParams = {
      TableName: oThis.tableName(),
      Key: oThis._keyObj({ baseCurrency: params.baseCurrency, quoteCurrency: params.quoteCurrency }),
      ExpressionAttributeNames: {
        '#pp': oThis.shortNameFor('pricePoint'),
        '#dcm': oThis.shortNameFor('decimal')
      },
      ExpressionAttributeValues: {
        ':ppUpdatedValue': { N: params.pricePoint.toString() },
        ':dcmValue': { N: params.decimal.toString() }
      },
      UpdateExpression: 'SET #pp = :ppUpdatedValue, #dcm = :dcmValue',
      ReturnValues: 'UPDATED_NEW'
    };

    logger.log('updateParams =======', updateParams);

    let updateResponse = await oThis.ddbServiceObj.updateItem(updateParams);

    if (updateResponse.isFailure()) {
      logger.error(`error update ${oThis.tableName()}`, updateResponse.toHash());
      return Promise.reject(updateResponse);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }
}

InstanceComposer.registerAsShadowableClass(LatestPricePointModel, coreConstants.icNameSpace, 'LatestPricePointModel');

module.exports = {};
