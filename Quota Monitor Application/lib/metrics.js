// create the metrics here and get registered in index.js
let client = require('prom-client')
let AWS = require('aws-sdk')
const fs = require('fs');
require('dotenv').config()
const metricMetadataPath = '/app-root/config/metric_metadata.json'

class PrometheusMetric {

    /**
     *  Prometheus metric class that converts raw data into proper metrics
     * @class PrometheusMetric
     */
    constructor() {
        AWS.config.update({ region: 'us-east-1' })
        this.taChecks = JSON.parse(fs.readFileSync(metricMetadataPath)).checks
        this.whitelistedServices = process.env.AWS_SERVICES === "" ? Object.keys(this.taChecks) : process.env.AWS_SERVICES.toLowerCase().split(',');
    }


    /**
     * Function to convert usage into Prometheus metrics. This function will convert a metric/ group of values into prometheus metrics.
     * @param  {string} metricName
     * @param  {string} helpDesc
     * @param  {object} labels
     * @param  {integer} value
     */
    async convertToPrometheusMetrics(metricName, helpDesc, labels, value) {
        //assume that the metric name has been transformed
        //create new gauge
        let gauge;
        let labelNames = Object.keys(labels);
        try {
            gauge = client.register.getSingleMetric(metricName);
        }
        catch (e) {
            console.log(e)
        }

        //read catch error 
        if (!gauge) {
            gauge = new client.Gauge({
                name: metricName,
                help: helpDesc,
                labelNames: labelNames,
            })
        }

        gauge.set(labels, value)

    }
    // creating this function under the assumption that every metric will contain region + name
    /**
     * @param  {} metricName - The Trusted Advisor check's name
     * 
     * Concatenates metric names into prometheus friendly names.
     */
    metricNameTransformer = (metricName) => {
        //lower caps, no brackets
        var finalMetricName = "cstack_quota_monitor".concat("_", [metricName].join('_')).concat("_total").toLowerCase()
        return finalMetricName.replace(/-/g, '_').replace(/[\(\)]/g, '').replace(/ /g, '_');
    }

    calculateUsageStatus = (usage, limit) => {
        let status;
        if (usage >= limit) {
            status = "Red"
        }
        else if (usage < limit && usage / limit * 100 >= 80) {
            status = "Yellow"
        }
        else {
            status = "Green"
        }
        return status;
    }


    listMetrics = async () => {
        console.log(await client.register.metrics())
    }
}

/**
Registers all metrics listed in the `metricMetadataPath` file. The metrics are transformed into Prometheus metrics. */
module.exports = PrometheusMetric;

