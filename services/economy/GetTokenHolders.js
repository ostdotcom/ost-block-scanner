'use strict';
/**
 * This service fetches array of transaction hashes present in a block
 *
 * @module services/economy/GetTokenHolders
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/ShardByEconomyAddress');
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/AddressBalance');

// Define serviceType for getting signature.
const serviceType = serviceTypes.GetTokenHolders;

/**
 * Class for getting block transactions service
 *
 * @class
 */
class GetTokenHolders extends ServicesBase {
  /**
   * Constructor for getting block transactions service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {String} contractAddress
   * @param {Object} options
   * @param {Object} options.nextPagePayload
   * @param {Object} options.nextPagePayload.LastEvaluatedKey
   * @param {Number} options.pageSize
   *
   * @constructor
   */
  constructor(chainId, contractAddress, options) {
    const params = { chainId: chainId, contractAddress: contractAddress };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.contractAddress = contractAddress;

    if (options) {
      if (options.nextPagePayload) {
        oThis.LastEvaluatedKey = options.nextPagePayload.LastEvaluatedKey;
      }
      oThis.pageSize = options.pageSize || paginationLimits.tokenHoldersLimit;
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let response = await oThis._fetchTokenHoldersForContract();

    return Promise.resolve(response);
  }

  /**
   * Fetch token holders of given economy
   *
   * @returns {Promise<void>}
   */
  async _fetchTokenHoldersForContract() {
    const oThis = this,
      shardByEconomyAddressKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'ShardByEconomyAddressModel'),
      economyAddrObj = new shardByEconomyAddressKlass({ consistentRead: 0 }),
      economyIdShortName = economyAddrObj.shortNameFor('economyIdentifier'),
      economyId = oThis.chainId + '-' + oThis.contractAddress,
      addressShortName = economyAddrObj.shortNameFor('address'),
      totalTransfersShortName = economyAddrObj.shortNameFor('totalTransactionsOrTransfers');

    let queryParams = {
      TableName: economyAddrObj.tableName(),
      IndexName: economyAddrObj.firstGlobalSecondaryIndexName(),
      Limit: oThis.pageSize,
      KeyConditionExpression: '#economyId = :economyId',
      ExpressionAttributeNames: {
        '#economyId': economyIdShortName
      },
      ExpressionAttributeValues: {
        ':economyId': {
          [economyAddrObj.defaultShortNameToDataType[economyIdShortName]]: economyId.toLowerCase()
        }
      },
      ScanIndexForward: false
    };

    if (oThis.LastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = oThis.LastEvaluatedKey;
    }

    let response = await economyAddrObj.ddbServiceObj.query(queryParams),
      tokenHolderData = response.data.Items;

    let result = [];
    for (let i = 0; i < tokenHolderData.length; i++) {
      let tokenHolder = tokenHolderData[i];

      result.push({
        chainId: oThis.chainId,
        contractAddress: oThis.contractAddress,
        address: tokenHolder[addressShortName][economyAddrObj.defaultShortNameToDataType[addressShortName]],
        totalTransfers:
          tokenHolder[totalTransfersShortName][economyAddrObj.defaultShortNameToDataType[totalTransfersShortName]]
      });
    }

    return Promise.resolve(
      responseHelper.successWithData({
        tokenHolders: result,
        nextPagePayload: { LastEvaluatedKey: response.data.LastEvaluatedKey }
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(GetTokenHolders, coreConstants.icNameSpace, 'GetTokenHolders');

module.exports = GetTokenHolders;
