'use strict';
/**
 * This service fetches array of transaction hashes for a user
 *
 * @module services/address/GetTransaction
 */
const rootPrefix = '../..',
  ServicesBase = require(rootPrefix + '/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  paginationLimits = require(rootPrefix + '/lib/globalConstant/paginationLimits'),
  serviceTypes = require(rootPrefix + '/lib/globalConstant/serviceTypes');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainSpecific/EconomyAddressTransaction');
require(rootPrefix + '/lib/models/sharded/byEconomyAddress/EconomyAddressTransaction');
require(rootPrefix + '/lib/cacheMultiManagement/shared/shardIdentifier/ByEconomyAddress');

// Define serviceType for getting signature.
const serviceType = serviceTypes.AddressTransactionHashes;

/**
 * Class for getting array of transaction hashes for a user
 *
 * @class
 */
class GetAddressTransaction extends ServicesBase {
  /**
   * Constructor for getting array of transaction hashes for a user
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
      oThis.pageSize = options.pageSize || paginationLimits.addressTransactionsLimit;
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
      userAddressesBalance = await oThis._fetchUserAddressTxHashesFromCache();
    } else {
      userAddressesBalance = await oThis._fetchUserAddressTxHashesFromDb();
    }

    return Promise.resolve(userAddressesBalance);
  }

  /**
   * This method fetches the transaction hashes associated to user address.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _fetchUserAddressTxHashesFromCache() {
    const oThis = this,
      EconomyAddressTransactionCacheClass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransactionCache'),
      response = await new EconomyAddressTransactionCacheClass({
        chainId: oThis.chainId,
        economyContractAddress: oThis.contractAddress,
        address: oThis.userAddress,
        shardIdentifier: oThis.shardIdentifier,
        consistentRead: oThis.consistentRead,
        pageSize: oThis.pageSize
      }).fetch();

    if (response.isFailure()) {
      logger.error('Error in fetching data from address transaction cache');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_a_gtx_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(response);
  }

  /**
   * This method fetches the transaction hashes associated to user address.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _fetchUserAddressTxHashesFromDb() {
    const oThis = this,
      EconomyAddressTransaction = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'EconomyAddressTransactionModel');

    // If shardIdentifier is unavailable.
    if (!oThis.shardIdentifier) {
      const ShardIdentifierByEconomyAddressCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'ShardIdentifierByEconomyAddressCache'),
        getShardRsp = await new ShardIdentifierByEconomyAddressCache({
          economyContractAddress: oThis.contractAddress,
          addresses: [oThis.userAddress], // Passing an array of userAddresses.
          chainId: oThis.chainId,
          consistentRead: oThis.consistentRead
        }).fetch();

      if (!getShardRsp.data[oThis.userAddress] || !getShardRsp.data[oThis.userAddress]['shardIdentifier']) {
        // This address hasn't been allocated a shard.
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_a_gtx_2',
            api_error_identifier: 'invalidAddress',
            debug_options: { getShardRsp: getShardRsp }
          })
        );
      }
      oThis.shardIdentifier = getShardRsp.data[oThis.userAddress]['shardIdentifier'];
    }

    let response = await new EconomyAddressTransaction({
      chainId: oThis.chainId,
      shardIdentifier: oThis.shardIdentifier,
      pageSize: oThis.pageSize
    }).getRecentTransactionHashes(oThis.userAddress, oThis.contractAddress, oThis.LastEvaluatedKey);

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(GetAddressTransaction, coreConstants.icNameSpace, 'GetAddressTransaction');

module.exports = GetAddressTransaction;
