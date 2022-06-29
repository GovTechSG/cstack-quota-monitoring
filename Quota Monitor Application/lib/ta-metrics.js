const AWS = require('aws-sdk');
const logger = new (require('./logger'))();
const fs = require('fs');
const client = require('prom-client')
const { register } = require('prom-client')
const metricMetadataPath = '/app-root/config/metric_metadata.json'



/**
Registers all metrics listed in the `config/metric_metadata.json` file. The metrics are transformed into Prometheus metrics. */
module.exports.registerTrustedAdvisorMetrics = async (accountId) => {
    const promMetrics = new (require('./metrics'))();
    let support = new AWS.Support({ region: 'us-east-1' });
    //read region whitelist from env
    const regionWhitelist = process.env.REGION_WHITELIST === "" ? [] : process.env.REGION_WHITELIST.split(',');
    const whitelistedServices = process.env.AWS_SERVICES === "" ? [] : process.env.AWS_SERVICES.toLowerCase().split(',');
    // read check details from json details
    let rawdata = fs.readFileSync(metricMetadataPath)
    let checks = JSON.parse(rawdata)
    for (const [resourceName, checkList] of Object.entries(checks.checks.ta_metrics)) {
        if (whitelistedServices.includes(resourceName) || whitelistedServices.length == 0) {
            for (const [metricName, metadata] of Object.entries(checkList)) {
                logger.log("DEBUG", `Current Metric: ${metricName} for account: ${accountId}`)
                var checkParams = {
                    checkId: metadata.id
                }
                // call AWS support TA results
                if (metadata.id) {
                    try {
                        var result = await support.describeTrustedAdvisorCheckResult(checkParams).promise()
                        // loop through each region and create a metric (gauge?)
                        const resources = result.result.flaggedResources
                        //read json data
                        resources.forEach(resource => {
                            // get region, metric name, service quota and current usage
                            if (regionWhitelist.includes(resource.region) || regionWhitelist.length === 0) {
                                const serviceQuota = parseInt(resource.metadata[3])
                                const currentUsage = parseInt(resource.metadata[4])
                                const region = resource.region.replace(/-/g, '_')
                                let labels = { region: region, status: resource.metadata[5], accountId: accountId }
                                promMetrics.convertToPrometheusMetrics(metadata.metricName, metadata.description, labels, currentUsage)
                                promMetrics.convertToPrometheusMetrics(metadata.metricName + '_max', metadata.description, labels, serviceQuota)

                            }
                        })
                    }
                    catch (error) {
                        console.log(error)
                        return []
                    }
                }

            }
        }
    }
    logger.log("DEBUG", `Completed registering Trusted Advisor Metrics for account ${accountId}`)
}
