'use strict';
/**
 * This service fetches block details for a set of block number
 *
 * @module services/block/Get
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataByBlockNumber');

// Define serviceType for getting signature.
const serviceType = serviceTypes.BlockDetails;

/**
 * Class for block details service
 *
 * @class
 */
class GetBlockDetail extends ServicesBase {
  /**
   * Constructor for block details service
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {Array} blockNumbers
   * @param {Object} options
   * @param {Object} options.blockNumberToShardIdentifierMap
   * @param {Number} options.consistentRead
   *
   * @constructor
   */
  constructor(chainId, blockNumbers, options) {
    const params = { chainId: chainId, blockNumbers: blockNumbers };
    super(params, serviceType);

    const oThis = this;

    oThis.chainId = chainId;
    oThis.blockNumbers = blockNumbers;
    if (options) {
      if (options.blockNumberToShardIdentifierMap)
        oThis.blockNumberToShardIdentifierMap = options.blockNumberToShardIdentifierMap;
    }
    oThis.shardIdentifierToBlockNumberMap = {};
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    if (oThis.blockNumberToShardIdentifierMap) {
      oThis._fetchShardIdentifiers();
    }

    const blockDetails = await oThis._fetchBlockDetails();

    return Promise.resolve(blockDetails);
  }

  /**
   * This method fetches the shard identifiers of a block from the input map.
   *
   * @private
   */
  _fetchShardIdentifiers() {
    const oThis = this;

    for (let blockNumber in oThis.blockNumberToShardIdentifierMap) {
      let shardIdentifier = oThis.blockNumberToShardIdentifierMap[blockNumber];

      if (shardIdentifier) {
        let shardIdentifier = oThis.blockNumberToShardIdentifierMap[blockNumber];
        oThis.shardIdentifierToBlockNumberMap[shardIdentifier] =
          oThis.shardIdentifierToBlockNumberMap[shardIdentifier] || [];
        oThis.shardIdentifierToBlockNumberMap[shardIdentifier].push(blockNumber);
      }
    }
  }

  /**
   * This method fetches the block details for the block numbers being passed.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchBlockDetails() {
    const oThis = this,
      BlockDataByBlockNoCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'BlockDataByBlockNoCache'),
      response = await new BlockDataByBlockNoCacheClass({
        chainId: oThis.chainId,
        blockNumbers: oThis.blockNumbers,
        blockNumberToShardIdentifierMap: oThis.blockNumberToShardIdentifierMap,
        shardIdentifierToBlockNumberMap: oThis.shardIdentifierToBlockNumberMap,
        consistentRead: oThis.consistentRead
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from block details cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_b_g_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetBlockDetail, coreConstants.icNameSpace, 'GetBlockDetail');

module.exports = GetBlockDetail;
