const { google } = require('googleapis');
const fs = require('fs');

const { GOOGLE_APPLICATION_CREDENTIALS, CLIENT_EMAIL, VIEW_ID } = process.env


async function getMetric(metrics, startDate, endDate) {
    // await setTimeout[Object.getOwnPropertySymbols(setTimeout)[0]](
    //   Math.trunc(1000 * Math.random()),
    // );   

    const read = fs.readFileSync(GOOGLE_APPLICATION_CREDENTIALS, 'utf8')

    const privateKey = JSON.parse(read).private_key.replace(new RegExp('\\\\n'), '\n');
    const scopes = ['https://www.googleapis.com/auth/analytics.readonly']

    const jwt = new google.auth.JWT(CLIENT_EMAIL, null, privateKey, scopes, null);

    const analytics = google.analytics('v3');

    const config = {
        auth: jwt,
        ids: `ga:${VIEW_ID}`,
        'start-date': startDate,
        'end-date': endDate,
        metrics: metrics,
    }
    const result = await analytics.data.ga.get(config);

    return result.data.totalsForAllResults[metrics];
}

async function getData(metrics, startDate = 'yesterday', endDate = 'today') {

    if (!GOOGLE_APPLICATION_CREDENTIALS) {
        return {}
    }

    const results = {};
    for (let i = 0; i < metrics.length; i += 1) {
        results[metrics[i]] = await getMetric(metrics[i], startDate, endDate)
    }
    return results;
}

async function parseMetric(metric) {
    let cleanMetric = metric;
    if (!cleanMetric.startsWith('ga:')) {
        cleanMetric = `ga:${cleanMetric}`;
    }
    return cleanMetric;
}

const getGoogleAnalytics = async () => {
    const metrics = [
        'ga:sessions',
        'ga:pageviews',
        'ga:uniquePageviews',
        'ga:timeOnPage',
        'ga:avgTimeOnPage'
    ]

    return await getData(metrics)
}

module.exports = {
    getGoogleAnalytics
}