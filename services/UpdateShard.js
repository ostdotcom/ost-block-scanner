'use strict';
/**
 * This service updates shard info.
 * Only is_available_for_allocation can be updated. If false, New entities will not be stored in this shard.
 *
 * @module services/UpdateShard
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cidPrefix = require(rootPrefix + '/lib/globalConstant/cidPrefix'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/models/shared/Shard');

// Define serviceType for getting signature.
const serviceType = serviceTypes.UpdateShard;

/**
 * Class for update shard service.
 *
 * @class
 */
class UpdateShard extends ServicesBase {
  /**
   * Constructor for update shard service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Number} shardNumber
   * @param {String} shardPrefix
   * @param {Boolean} isAvailable
   *
   * @constructor
   */
  constructor(chainId, shardNumber, shardPrefix, isAvailable) {
    const params = { chainId: chainId, shardNumber: shardNumber, shardPrefix: shardPrefix, isAvailable: isAvailable };
    super(params, serviceType);

    const oThis = this;

    oThis.shardNumber = shardNumber;
    oThis.isAvailable = isAvailable;

    oThis.identifier = cidPrefix[shardPrefix] + '_' + chainId;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    // Update shard.
    await oThis.updateShard();
  }

  /**
   * This function creates an entry in the chains table.
   *
   * @returns {Promise<void>}
   */
  async updateShard() {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObject = new ShardModel({
        consistentRead: oThis.consistentRead
      });

    const insertParams = {
      TableName: shardModelObject.tableName(),
      Key: oThis._keyObj({ identifier: oThis.identifier, shardNumber: oThis.shardNumber.toString() }),
      ExpressionAttributeNames: {
        '#iafa': shardModelObject.shortNameFor('isAvailableForAllocation')
      },
      ExpressionAttributeValues: {
        ':iafaUpdatedValue': { BOOL: oThis.isAvailable }
      },
      UpdateExpression: 'SET #iafa = :iafaUpdatedValue',
      ReturnValues: 'UPDATED_NEW'
    };

    let updateResponse = await shardModelObject.ddbServiceObj.updateItem(insertParams);

    if (updateResponse.isFailure()) {
      logger.error(`error update ${shardModelObject.tableName()}`, updateResponse.toHash());
      return Promise.reject(updateResponse);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Primary key of the table.
   *
   * @returns {Object}
   */
  _keyObj(params) {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObject = new ShardModel({
        consistentRead: oThis.consistentRead
      }),
      keyObj = {};

    keyObj[shardModelObject.shortNameFor('identifier')] = { S: params['identifier'].toLowerCase() };
    keyObj[shardModelObject.shortNameFor('shardNumber')] = { N: params['shardNumber'] };

    return keyObj;
  }
}

InstanceComposer.registerAsShadowableClass(UpdateShard, coreConstants.icNameSpace, 'UpdateShardService');

module.exports = UpdateShard;
