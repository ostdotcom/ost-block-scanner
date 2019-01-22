'use strict';
/**
 * This service fetches transfers of a user
 *
 * @module services/address/GetTransfer
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  signatureConstants = require(rootPrefix + '/lib/globalConstant/signatureConstants');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainSpecific/EconomyAddressTransfer');
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransfer');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');

// Define serviceType for getting signature.
const serviceType = signatureConstants.AddressTransfers;

/**
 * Class for getting transfers of a user
 *
 * @class
 */
class GetAddressTransfer extends ServicesBase {
  /**
   * Constructor for getting transfers of a user
   *
   * @augments ServicesBase
   *
   * @param {Number} chainId
   * @param {String} userAddress
   * @param {String} contractAddress
   * @param {Object} options
   * @param {Object} options.nextPagePayload
   * @param {Object} options.contractAddressToShardIdentifierMap
   * @param {Number} options.pageSize
   *
   * @constructor
   *
   */
  constructor(chainId, userAddress, contractAddress, options) {
    const params = { chainId: chainId, userAddress: userAddress, contractAddress: contractAddress };
    super(params, serviceType);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.userAddress = userAddress;
    oThis.contractAddress = contractAddress;
    oThis.shardIdentifier = null;
    if (options) {
      if (options.contractAddressToShardIdentifierMap) {
        oThis.shardIdentifier = options.contractAddressToShardIdentifierMap[oThis.contractAddress];
      }
      if (options.nextPagePayload) {
        oThis.LastEvaluatedKey = options.nextPagePayload.LastEvaluatedKey;
      }
      oThis.pageSize = options.pageSize || paginationLimits.addressTransfersLimit;
    }
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    let userAddressesBalance = null;

    if (!oThis.LastEvaluatedKey) {
      userAddressesBalance = await oThis._fetchUserAddressTransfersFromCache();
    } else {
      userAddressesBalance = await oThis._fetchUserAddressTransfersFromDb();
    }

    return Promise.resolve(userAddressesBalance);
  }

  /**
   * This method fetches the transfers associated to user address.
   *
   * @returns {Promise<>}
   * @private
   */
  async _fetchUserAddressTransfersFromCache() {
    const oThis = this,
      EconomyAddressTransferCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransferCache'),
      response = await new EconomyAddressTransferCacheClass({
        chainId: oThis.chainId,
        economyContractAddress: oThis.contractAddress,
        address: oThis.userAddress,
        shardIdentifier: oThis.shardIdentifier,
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from address transfer cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_a_gtf_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }

  /**
   * This method fetches the transfers associated to user address.
   *
   * @returns {Promise<>}
   * @private
   */
  async _fetchUserAddressTransfersFromDb() {
    const oThis = this,
      EconomyAddressTransfer = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransferModel');

    // If shardIdentifier is unavailable.
    if (!oThis.shardIdentifier) {
      const ShardIdentifierByEconomyAddressCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
        getShardRsp = await new ShardIdentifierByEconomyAddressCache({
          economyContractAddress: oThis.contractAddress,
          addresses: [oThis.userAddress],
          chainId: oThis.chainId,
          consistentRead: oThis.consistentRead
        }).fetch();

      if (!getShardRsp.data[oThis.userAddress] || !getShardRsp.data[oThis.userAddress]['shardIdentifier']) {
        // This address hasn't been allocated a shard.
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_a_gtf_2',
            api_error_identifier: 'invalid_address',
            debug_options: { getShardRsp: getShardRsp }
          })
        );
      }
      oThis.shardIdentifier = getShardRsp.data[oThis.userAddress]['shardIdentifier'];
    }

    let response = await new EconomyAddressTransfer({
      chainId: oThis.chainId,
      shardIdentifier: oThis.shardIdentifier,
      pageSize: oThis.pageSize
    }).getRecentTransfers(oThis.userAddress, oThis.contractAddress, oThis.LastEvaluatedKey);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetAddressTransfer, coreConstants.icNameSpace, 'GetAddressTransfer');

module.exports = GetAddressTransfer;
