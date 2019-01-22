'use strict';
/**
 * This service calculates the token balances for user addresses for batch of tran
 *
 * @module lib/transactionParser/SumUserTokenBalances
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  commonValidator = require(rootPrefix + '/lib/validators/common'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorConfig = basicHelper.getErrorConfig();

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class for balance settler
 *
 * @class
 */
class SumUserTokenBalances {
  /**
   * Constructor for balance settler
   *
   * @param {Object} params
   * @param {Array} params.tokenTransferMap: txHash mapped to transfer events
   * @param {Number} params.chainId: chain id from node
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenTransferMap = params.tokenTransferMap;
    oThis.chainId = params.chainId;

    oThis.economyContractAddrToDetailsMap = {};
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of services/balance/Settler.js');
      return responseHelper.error({
        internal_error_identifier: 's_bs_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.calculateAggregatedBalances();

    return Promise.resolve(
      responseHelper.successWithData({
        addressBalancesToSettle: oThis.economyContractAddrToDetailsMap
      })
    );
  }

  /**
   * This function calculates the user balances for each user using transfer events.
   *
   * @returns {Promise<>}
   */
  async calculateAggregatedBalances() {
    const oThis = this;

    for (let txHash in oThis.tokenTransferMap) {
      let transferEvents = oThis.tokenTransferMap[txHash];

      for (let index = 0; index < transferEvents.length; index++) {
        let event = transferEvents[index];

        oThis.economyContractAddrToDetailsMap[event.contractAddress] =
          oThis.economyContractAddrToDetailsMap[event.contractAddress] || {};

        let userAddrToDetails = oThis.economyContractAddrToDetailsMap[event.contractAddress];

        let amountToTransferInWei = 0;

        if (
          !commonValidator.isVarNull(event.amount) &&
          !commonValidator.isVarFalse(event.amount) &&
          basicHelper.isWeiValid(event.amount)
        ) {
          amountToTransferInWei = event.amount;
        }

        if (event.contractAddress && basicHelper.isAddressValid(event.contractAddress)) {
          if (
            event.from &&
            event.to &&
            basicHelper.isAddressValid(event.from) &&
            basicHelper.isAddressValid(event.to)
          ) {
            let addresses = [event.from, event.to];

            for (let index in addresses) {
              if (userAddrToDetails[addresses[index]]) {
              }
              //user is new, then sets the value to zero
              userAddrToDetails[addresses[index]] = userAddrToDetails[addresses[index]] || {
                balance: basicHelper.convertToWei(basicHelper.convertToBigNumber(0)).toNumber(),
                totalTransactions: 0,
                totalTokenTransfers: 0
              };
            }

            let amtSubtractedFromSender = 0,
              amtTransferredToReceiver = 0;

            // transfer event amount conversion for calculations
            amtSubtractedFromSender = basicHelper
              .convertToNormal(amountToTransferInWei)
              .mul(basicHelper.convertToBigNumber(-1));
            amtTransferredToReceiver = basicHelper.convertToNormal(amountToTransferInWei);

            // find current balance of sender and receiver
            let senderBalance = basicHelper.convertToNormal(userAddrToDetails[event.from]['balance']),
              receiverBalance = basicHelper.convertToNormal(userAddrToDetails[event.to]['balance']);

            // calculate settled amount using amount from transfer event
            let senderSettledAmount = senderBalance.add(amtSubtractedFromSender),
              receiverSettledAmount = receiverBalance.add(amtTransferredToReceiver);

            // final settlement
            Object.assign(userAddrToDetails[event.from], {
              balance: basicHelper.convertToWei(senderSettledAmount).toString(10),
              totalTokenTransfers: userAddrToDetails[event.from]['totalTokenTransfers'] + 1
            });
            userAddrToDetails[event.from]['transactions'] = userAddrToDetails[event.from]['transactions'] || [];
            if (!userAddrToDetails[event.from]['transactions'].includes(txHash)) {
              userAddrToDetails[event.from]['transactions'].push(txHash);
            }

            Object.assign(userAddrToDetails[event.to], {
              balance: basicHelper.convertToWei(receiverSettledAmount).toString(10),
              totalTokenTransfers: userAddrToDetails[event.to]['totalTokenTransfers'] + 1
            });
            userAddrToDetails[event.to]['transactions'] = userAddrToDetails[event.to]['transactions'] || [];
            if (!userAddrToDetails[event.to]['transactions'].includes(txHash)) {
              userAddrToDetails[event.to]['transactions'].push(txHash);
            }
          }
        }
        Object.assign(oThis.economyContractAddrToDetailsMap[event.contractAddress], userAddrToDetails);
      }
    }

    return Promise.resolve();
  }
}

InstanceComposer.registerAsShadowableClass(SumUserTokenBalances, coreConstants.icNameSpace, 'SumUserTokenBalances');

module.exports = SumUserTokenBalances;
