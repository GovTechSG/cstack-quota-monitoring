const AWS = require('aws-sdk');
// const region = 'ap-southeast-1'
const awsRegions = require('aws-regions')
const fs = require('fs');
const logger = new (require('./logger'))();
const promMetrics = new (require('./metrics'))();
const metricMetadataPath = '/app-root/config/metric_metadata.json'


class aws_other_metrics {
    constructor(accountId, accessKeyId, secretAccessKey) {
        this.metricMetaDatas = JSON.parse(fs.readFileSync(metricMetadataPath)).checks.non_ta_metrics;
        this.accountId = accountId
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey
        this.quotaCodes = {
            s3: {
                buckets: 'L-DC2B2D3D'
            },
            backup: {
                vaults: 'L-7705D2CB',
                plans: 'L-BD69F607'
            }
        }
    }
    /**
     * Function to return a list of AWS region codes.
     */
    awsRegionCodes = () => {
        let result = []
        const regionWhitelist = process.env.REGION_WHITELIST === "" ? [] : process.env.REGION_WHITELIST.split(',');
        for (let region of awsRegions.list()) {
            if (regionWhitelist.includes(region.code) || regionWhitelist.length === 0) {
                result.push(region.code)
            }
        }
        return result;

    }
    /**
     * Function to get either the applied quota value or default quota value of a quota code.
     * @param  {string} quotaCode
     * @param  {string} serviceCode
     */
    async get_quota(quotaCode, serviceCode) {
        try {
            let sq = new AWS.ServiceQuotas({
                maxRetries: 2,
                httpOptions: {
                    timeout: 3000,
                    connectTimeout: 5000
                },
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey

            });
            let serviceQuotaMax;
            try {
                serviceQuotaMax = await sq.getServiceQuota({ QuotaCode: quotaCode, ServiceCode: serviceCode }).promise()
            }
            catch (e) {
                serviceQuotaMax = await sq.getAWSDefaultServiceQuota({ QuotaCode: quotaCode, ServiceCode: serviceCode }).promise()
            }
            return serviceQuotaMax.Quota.Value
        }
        catch (err) {
            console.log(`Failed to get service quotas for quota code:$${quotaCode}`)
            console.log(err)
        }
    }
    /**
     * Helper function to contain all metrics registered in the file. To use a new metric, place it in this function.
     */
    async register_all_metrics() {
        //runs all register metrics
        this.register_s3_buckets_metrics();
        this.register_backup_plans_metrics();
        this.register_backup_vaults_metrics()
    }

    async register_s3_buckets_metrics() {
        var metricMetaData = this.metricMetaDatas.s3.cstack_quota_monitor_s3_bucket_count_total;
        logger.log("DEBUG", `Current Metric: ${metricMetaData.metricName} for account: ${this.accountId}`)
        let serviceQuotaMax = Number(metricMetaData.customQuotas[this.accountId]);
        //check if config exists for max
        if (!serviceQuotaMax) serviceQuotaMax = await this.get_quota(this.quotaCodes.s3.buckets, 's3');
        let s3 = new AWS.S3({ accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey });
        const buckets = await s3.listBuckets().promise()
        const usage = buckets.Buckets.length;
        //create prometheus metric
        let status = promMetrics.calculateUsageStatus(usage, serviceQuotaMax);
        let labels = { region: null, status: status, accountId: this.accountId }
        promMetrics.convertToPrometheusMetrics(metricMetaData.metricName, metricMetaData.description, labels, usage)
        promMetrics.convertToPrometheusMetrics(metricMetaData.metricName + "_max", metricMetaData.description, labels, serviceQuotaMax)

    }

    async register_backup_vaults_metrics() {
        let metricMetaData = this.metricMetaDatas.backup.cstack_quota_monitor_backup_backup_vaults_total;
        logger.log("DEBUG", `Current Metric: ${metricMetaData.metricName} for account: ${this.accountId}`)
        for (let region of this.awsRegionCodes()) {
            try {
                //if there's a custom quota set up in the JSON file, read it.
                let serviceQuotaMax = Number(metricMetaData.customQuotas[this.accountId][region]);
                //else get AWS Default Quota
                if (!serviceQuotaMax) serviceQuotaMax = await this.get_quota(this.quotaCodes.backup.vaults, 'backup');
                let backup = new AWS.Backup({ region: region, accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey });
                const response = await backup.listBackupVaults().promise();
                const backupVaultUsage = response.BackupVaultList.length;
                let status = promMetrics.calculateUsageStatus(backupVaultUsage, serviceQuotaMax);
                let labels = { region: region, status: status, accountId: this.accountId }
                promMetrics.convertToPrometheusMetrics(metricMetaData.metricName, metricMetaData.description, labels, backupVaultUsage)
                promMetrics.convertToPrometheusMetrics(metricMetaData.metricName + "_max", metricMetaData.description, labels, serviceQuotaMax)

            }
            catch (e) {
            }

        }
        logger.log("DEBUG", `Completed registering Backup Vault metrics for account ${this.accountId}`)
    }

    async register_backup_plans_metrics() {
        let metricMetaData = this.metricMetaDatas.backup.cstack_quota_monitor_backup_backup_plans_total;
        logger.log("DEBUG", `Current Metric: ${metricMetaData.metricName} for account: ${this.accountId}`)
        for (let region of this.awsRegionCodes()) {
            try {
                //if there's a custom quota set up in the JSON file, read it.
                let serviceQuotaMax = Number(metricMetaData.customQuotas[this.accountId][region]);
                //else get AWS Default Quota
                if (!serviceQuotaMax) serviceQuotaMax = await this.get_quota(this.quotaCodes.backup.plans, 'backup');
                let backup = new AWS.Backup({ region: region, accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey });
                const response = await backup.listBackupPlans().promise();
                const backupPlansUsage = response.BackupPlansList.length
                let status = promMetrics.calculateUsageStatus(backupPlansUsage, serviceQuotaMax);
                let labels = { region: region, status: status, accountId: this.accountId }
                promMetrics.convertToPrometheusMetrics(metricMetaData.metricName, metricMetaData.description, labels, backupPlansUsage)
                promMetrics.convertToPrometheusMetrics(metricMetaData.metricName + "_max", metricMetaData.description, labels, serviceQuotaMax)

            }
            catch (e) {
            }
        }
        logger.log("DEBUG", `Completed registering Backup Plans metrics for account ${this.accountId}`)
    }
}

module.exports = aws_other_metrics;