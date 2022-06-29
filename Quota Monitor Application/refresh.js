let TARefresh = require('./lib/ta-refresh');
const LOGGER = new (require('./lib/logger'))();
// const vCPU_check = new (require('./lib/vCPU-check'))()
let ta_metrics = require('./lib/ta-metrics')
const AWS = require('aws-sdk');


const main = async () => {

    // vCPU_check.checkForVCPULimits();
    try {
        const accessKeys = process.env.ACCESS_KEYS.split(',')
        const secretKeys = process.env.SECRET_KEYS.split(',')
        for (index in accessKeys) {
            //update aws config
            AWS.config.update({ accessKeyId: accessKeys[index], secretAccessKey: secretKeys[index] })
            var sts = new AWS.STS();
            const stsResponse = await sts.getCallerIdentity().promise();
            const accountId = stsResponse.Account;
            console.log(`Registering metrics for account:${accountId}`)
            const _taRefresh = new TARefresh();
            _taRefresh.getTARefreshStatus(function (err, data) {
                if (err) {
                    LOGGER.log('ERROR', err);
                }
                console.log(`TA metrics refreshed successfully`)
            });
            let other_metrics = new (require('./lib/other-metrics'))(accountId, accessKeys[index], secretKeys[index]);
            other_metrics.register_all_metrics(accountId);
            ta_metrics.registerTrustedAdvisorMetrics(accountId);
        }
    }
    catch (e) {
        LOGGER.log("ERROR", e)
    }


}

main();