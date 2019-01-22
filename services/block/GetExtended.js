'use strict';
/**
 * This service fetches block details for a set of block number
 *
 * @module services/block/Get
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  OSTBase = require('@openstfoundation/openst-base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheMultiManagement/chainSpecific/BlockDataExtendedByBlockNumber');

// Define serviceType for getting signature.
const serviceType = signatureConstants.BlockDetailsExtended;

/**
 * Class for block details service
 *
 * @class
 */
class GetBlockDetailExtended extends ServicesBase {
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
      BlockDataExtendedByBlockNoCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'BlockDataExtendedByBlockNoCache'),
      response = await new BlockDataExtendedByBlockNoCache({
        chainId: oThis.chainId,
        blockNumbers: oThis.blockNumbers,
        blockNumberToShardIdentifierMap: oThis.blockNumberToShardIdentifierMap,
        shardIdentifierToBlockNumberMap: oThis.shardIdentifierToBlockNumberMap,
        consistentRead: oThis.consistentRead
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from block details extended cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_b_ge_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetBlockDetailExtended, coreConstants.icNameSpace, 'GetBlockDetailExtended');

module.exports = GetBlockDetailExtended;
