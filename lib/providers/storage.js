'use strict';
/**
 * OSTStorage Provider
 *
 * @module lib/providers/storage
 */
const OSTStorage = require('@ostdotcom/storage');

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/formatter/config');

/**
 * Class for storage provider
 *
 * @class
 */
class StorageProvider {
  /**
   * Constructor for storage provider
   *
   * @param {Object} configStrategy
   * @param instanceComposer
   */
  constructor(configStrategy, instanceComposer) {}

  /**
   * Get instance of ost-storage.
   *
   * @returns {Object}
   */
  getInstance(dbType, chainId) {
    const oThis = this;

    return OSTStorage.getInstance(oThis.getStorageConfigStrategy(dbType, chainId));
  }

  /**
   * Get storage config strategy
   *
   * @param {String} dbType: shared or sharded
   * @param {Number} chainId: chain id
   */
  getStorageConfigStrategy(dbType, chainId) {
    const oThis = this,
      blockScannerConfigStrategy = oThis.ic().configStrategy,
      configFormatter = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'configFormatter');

    switch (dbType) {
      case storageConstants.shared:
        if (!blockScannerConfigStrategy.storage) {
          throw `missing db config for ${dbType}`;
        }

        return Object.assign(
          {},
          configFormatter.formatStorageConfig(blockScannerConfigStrategy),
          configFormatter.formatCacheConfig(blockScannerConfigStrategy)
        );
      case storageConstants.sharded:
        let chainConfig = configFormatter.configFor(chainId);
        if (!chainConfig) {
          throw `missing db config for ${dbType} - ${chainId} pair`;
        }
        return Object.assign(
          {},
          configFormatter.formatStorageConfig(chainConfig),
          configFormatter.formatCacheConfig(chainConfig)
        );
      default:
        throw `unsupported ${dbType}`;
    }
  }
}

InstanceComposer.registerAsObject(StorageProvider, coreConstants.icNameSpace, 'storageProvider', true);

module.exports = StorageProvider;
