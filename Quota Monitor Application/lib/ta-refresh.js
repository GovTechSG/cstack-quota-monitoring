/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' })
let async = require('async');
const LOGGER = new (require('./logger'))();
require('dotenv').config()
const fs = require('fs');
const metricMetadataPath = '/app-root/config/metric_metadata.json'





/**
 * Performs Trusted Advisor refresh
 *
 * @class tarefresh
 */
class tarefresh {
  /**
   * @class tarefresh
   * @constructor
   */
  constructor() {
    // const param = {
    //   accessKeyId: process.env.accessKeyId,
    //   secretAccessKey: process.env.secretAccessKey
    // }
    this.support = new AWS.Support({ region: 'us-east-1' });
    let rawdata = fs.readFileSync(metricMetadataPath)
    this.serviceChecks = JSON.parse(rawdata).checks
    //user provided services for TA refresh
    let _whitelistedServices;
    if (process.env.AWS_SERVICES === "") {
      _whitelistedServices = Object.keys(this.serviceChecks)
    }
    else {
      _whitelistedServices = process.env.AWS_SERVICES.toLowerCase().split(',')
    }
    this.userServices = _whitelistedServices
  }

  /**
   * [getTARefreshStatus description]
   * @param  {[type]}   event [description]
   * @param  {Function} cb    [description]
   * @return {[type]}         [description]
   */


  /**
   * This function checks if the customers have opted-in for the vCPU limits from Ec2 service.
   * If the customers have opted in, the function will update the checks that will be performed by Trusted Advisor.
   */
  // async getUpdatedEC2Checks() {
  //   let limits_ec2_Standard_OnDemand = {
  //     QuotaCode: 'L-1216C47A',
  //     ServiceCode: 'ec2'
  //   };
  //   let servicequotas = new AWS.ServiceQuotas();
  //   try {
  //     let response = await servicequotas.getAWSDefaultServiceQuota(limits_ec2_Standard_OnDemand).promise();
  //     if (response.Quota.ServiceCode === "ec2")
  //       serviceChecks.EC2 = ['iH7PP0l7J9'];
  //   } catch (err) {
  //     LOGGER.log('ERROR', err);
  //   }
  // }

  async getTARefreshStatus(cb) {
    // await this.getUpdatedEC2Checks();
    // LOGGER.log('INFO', serviceChecks.EC2);
    const _self = this;
    async.each(
      _self.userServices,
      function (service, callback_p) {
        async.each(
          _self.serviceChecks[service],
          function (check, callback_e) {
            if (check.id) {
              _self.refreshTA(check.id, function (err, data) {
                if (err) {
                  LOGGER.log(
                    'DEBUG',
                    `TA checkId could not be refreshed: ${check.id} ${err}`
                  );
                }
                LOGGER.log('DEBUG', `${check.id} has been refreshed successfully`)
                callback_e();
              });
            }
          },
          function (err) {
            callback_p();
          }
        );
      },
      function (err) {
        return cb(null, {
          Result: 'TA refresh done',
          Error: err
        });
      }
    );
  }

  /**
   * [refreshTA description]
   * @param  {[type]}   checkId [description]
   * @param  {Function} cb      [description]
   * @return {[type]}           [description]
   */
  refreshTA(checkId, cb) {
    const _self = this;
    let params = {
      checkId: checkId /* required */,
    };

    this.support.refreshTrustedAdvisorCheck(params, function (err, data) {
      if (err) {
        return cb(err, null);
      }

      return cb(null, {
        result: data,
      });
    });
  }
}

module.exports = tarefresh;
