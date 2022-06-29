const http = require('http')
const url = require('url')
const express = require('express')
const router = express.Router();
const client = require('prom-client')
const metric = require("./lib/metrics")
let TARefresh = require('./lib/ta-refresh');
let ta_metrics = require('./lib/ta-metrics')
const AWS = require('aws-sdk');


router.get("/", (req, res) => {
    res.send('Hello World!')
})

router.get("/metrics", async (req, res) => {
    res.setHeader('Content-Type', client.register.contentType)
    res.send(await client.register.metrics())
})

router.get('/refresh', async (req, res) => {
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
        res.status(200).send();
    }
    catch (e) {
        LOGGER.log("ERROR", e)
        res.send(e)
    }
})

module.exports = router;
