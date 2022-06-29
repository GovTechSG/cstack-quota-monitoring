const express = require('express')
const app = express()
const port = 8080;
const cors = require('cors');
const client = require('prom-client')
var router = require("./index")
// const vCPU_check = new (require('./lib/vCPU-check'))()
let ta_metrics = require('./lib/ta-metrics')
const AWS = require('aws-sdk');
const fs = require('fs');



app.use(cors());
app.use(express.json()); //JSON Parser
//do set up (include env var to filter only specific regions?)
const main = async () => {
    app.use("/", router);

    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    });
    //iterate through access keys
    const accessKeys = process.env.ACCESS_KEYS.split(',')
    const secretKeys = process.env.SECRET_KEYS.split(',')
    client.register.setDefaultLabels({
        app: 'limit-monitor-solution',
    })
    for (index in accessKeys) {
        //update aws condig
        AWS.config.update({ accessKeyId: accessKeys[index], secretAccessKey: secretKeys[index] })
        var sts = new AWS.STS();
        const stsResponse = await sts.getCallerIdentity().promise();
        const accountId = stsResponse.Account;
        console.log(`Registering metrics for account:${accountId}`)

        //Set up metrics
        // vCPU_check.checkForVCPULimits();
        let other_metrics = new (require('./lib/other-metrics'))(accountId, accessKeys[index], secretKeys[index]);
        other_metrics.register_all_metrics(accountId);
        ta_metrics.registerTrustedAdvisorMetrics(accountId);

    }

}


main();




