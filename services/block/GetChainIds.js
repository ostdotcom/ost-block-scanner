'use strict';
/**
 * This service fetches block details for a set of block number
 *
 * @module services/block/ChainIds
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/shared/BlockChainIds');

// Define serviceType for getting signature.
const serviceType = signatureConstants.BlockChainIds;

/**
 * Class for block details service
 *
 * @class
 */
class GetBlockChainIds extends ServicesBase {
  /**
   * Constructor for block details service
   *
   * @augments ServicesBase
   *
   * @param {Number} blockNumber
   *
   * @constructor
   */
  constructor(blockNumber) {
    const params = { blockNumber: blockNumber };
    super(params, serviceType);

    const oThis = this;

    oThis.blockNumber = blockNumber;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    const blockChainIds = await oThis._fetchBlockChainIds();

    return Promise.resolve(blockChainIds);
  }

  /**
   * This method fetches the block details for the block numbers being passed.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchBlockChainIds() {
    const oThis = this,
      BlockToChainIdsCacheClass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockChainIdsCache'),
      response = await new BlockToChainIdsCacheClass({
        blockNumber: oThis.blockNumber
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from block to chain ids cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_b_ci_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetBlockChainIds, coreConstants.icNameSpace, 'GetBlockChainIds');

module.exports = GetBlockChainIds;
