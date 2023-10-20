'use strict';
var util = require('util');
const moment = require('moment-timezone');
const apiService = require('./sfmc-api-service');

// Deps
const Path = require('path');
const JWT = require(Path.join(__dirname, '..', 'lib', 'jwtDecoder.js'));
var util = require('util');
var http = require('https');

exports.logExecuteData = [];

function logData(req) {
    exports.logExecuteData.push({
        body: req.body,
        headers: req.headers,
        trailers: req.trailers,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        route: req.route,
        cookies: req.cookies,
        ip: req.ip,
        path: req.path,
        host: req.hostname,
        fresh: req.fresh,
        stale: req.stale,
        protocol: req.protocol,
        secure: req.secure,
        originalUrl: req.originalUrl
    });
    console.log("body: " + util.inspect(req.body));
    console.log("headers: " + req.headers);
    console.log("trailers: " + req.trailers);
    console.log("method: " + req.method);
    console.log("url: " + req.url);
    console.log("params: " + util.inspect(req.params));
    console.log("query: " + util.inspect(req.query));
    console.log("route: " + req.route);
    console.log("cookies: " + req.cookies);
    console.log("ip: " + req.ip);
    console.log("path: " + req.path);
    console.log("host: " + req.hostname);
    console.log("fresh: " + req.fresh);
    console.log("stale: " + req.stale);
    console.log("protocol: " + req.protocol);
    console.log("secure: " + req.secure);
    console.log("originalUrl: " + req.originalUrl);
}

/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Edit');
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    apiService("TEST TIME DUMMY", {
        "inArguments": [{
            "tokens": {
                "token": "0ehL-s1ljyuP-h2IgS4Z9aSLmBWSqCVZkSeBno2GB7h8vDbWVX073r3oX0dbl8o2cFQ-Xs0VbQVCu8UCkPc9FBcnXPR9ZvFAcRl8OU4dwK3SZjlUiErmxttnBg47uFsmXJddliRxUdVvFyCe4tjk8hSYY8m6TelekoSSFjYut22HTZ_PQ1No0WmMMv_gDlZn3MsB989-9rIyh2sDXu_LXija8B5b9xN8PssGCzz9XK4J2Tj5RRGquFqNo0y85R2iYNI-hY2rGHjazDk3mDa7I1Q",
                "fuel2token": "7nUP1ZuDajzbbWecJisYBt3z",
                "expires": 1697610005891,
                "stackKey": "S7",
                "EID": 7229188,
                "MID": 7229188,
                "UID": 717508163
            },
            "userConfig": [{
                "dynamicAttributeLogicalOperator": "and",
                "dynamicAttributes": [{"property": "FirstName", "operator": "eq", "operand": "JOHN"}],
                "dateAttribute": {
                    "property": "PurchaseDate",
                    "duration": "2",
                    "unit": "days",
                    "timeline": "Before",
                    "timeZone": "Asia/Calcutta",
                    "extendWait": true,
                    "extendTime": "04:00 AM"
                }
            }],
            "FirstName": "Johnny",
            "PurchaseDate": "10/4/2023 12:00:00 AM"
        }],
        "outArguments": [],
        "activityObjectID": "0a074b98-bef8-4c9f-b3a7-db94ab1dda5b",
        "journeyId": "61f97634-5a98-4706-bb84-cbf384e5284f",
        "activityId": "0a074b98-bef8-4c9f-b3a7-db94ab1dda5b",
        "definitionInstanceId": "2a37f99b-5b85-4893-adb4-d38a5c9c91a3",
        "activityInstanceId": "4e115c74-6bea-40ba-84ea-2bc09ee51bae",
        "keyValue": "test213@test.com",
        "mode": 0
    });
    res.status(200).send('Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
    function computeWaitTime(decoded) {
        let date;
        const inArgs = decoded.inArguments[0] || {};
        for (let uc of (inArgs.userConfig || [])) {
            const eachConditionResults = (uc.dynamicAttributes || []).map(da => {
                console.log({da})

                /* TODO: lt gt operator to be used only for int types */
                switch (da.operator) {
                    case "eq":
                        return inArgs[da.property] === da.operand;
                    case "ne":
                        return inArgs[da.property] !== da.operand;
                    case "lt":
                        return inArgs[da.property] < da.operand;
                    case "le":
                        return inArgs[da.property] <= da.operand;
                    case "gt":
                        return inArgs[da.property] > da.operand;
                    case "ge":
                        return inArgs[da.property] >= da.operand;
                    default:
                        return false;
                }
            });

            let isAnd = uc.dynamicAttributeLogicalOperator === 'and';
            const dgConditionMatches = eachConditionResults.reduce((acc, curr) => isAnd ? acc && curr : acc || curr);
            console.log({bools: eachConditionResults, out: dgConditionMatches});

            /* dynamic attributes matches the specified condition for the Journey data */
            if (dgConditionMatches) {
                let dateAttribute = uc.dateAttribute;
                const dateStr = inArgs[dateAttribute.property]; // eg. 10/4/2023 12:00:00 AM
                console.log({dateStr, dateAttributeF: dateAttribute})
                date = moment.tz(dateStr, 'M/D/YYYY hh:mm:ss A', dateAttribute.timeZone);
                console.log('Moment datetime: ', {date, str: date.toString()});

                switch (dateAttribute.timeline) {
                    case 'On':
                        break;

                    case 'Before':
                        date.subtract(dateAttribute.duration, dateAttribute.unit);
                        break;

                    case 'After':
                        date.add(dateAttribute.duration, dateAttribute.unit);
                }
                console.log('date after logic: ', date.toString());

                /* if extend is chosen */
                if (dateAttribute.extendWait) {
                    console.log("extend time logic....")
                    const dtStr = moment(date).format('M/D/YYYY') + ' ' + dateAttribute.extendTime;
                    console.log("extend time logic: Current date with extended time str = ", dtStr);
                    const extendedDate = moment.tz(dtStr, 'M/D/YYYY hh:mm:ss A', dateAttribute.timeZone);
                    console.log("extend time logic: Current date with extended time moment = ", extendedDate);

                    console.log("extendedDate.isBefore(date) ? ", extendedDate.isBefore(date));
                    console.log("extendedDate.isAfter(date) ? ", extendedDate.isAfter(date));
                    if (extendedDate.isAfter(date)) {
                        date = extendedDate;
                    }
                    console.log('date after extend logic: ', date.toString());
                }

                /* breaking as the first matched condition is taken and rest are ignored */
                break;
            }
        }// loop ends
        console.log('Final wait time computed: ', date);
        return date;
    }

    JWT(req.body, process.env.jwtSecret, (err, decoded) => {

        // verification error -> unauthorized request
        if (err) {
            console.error(err);
            return res.status(401).end();
        }

        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
            const decodedArgs = decoded.inArguments[0];

            /* determine the wait date time */
            const waitTime = computeWaitTime(decoded);
            if (waitTime) {
                apiService(waitTime, decoded)
                    .then(resp => {
                        // decoded in arguments
                        var request = require('request');
                        var url = 'https://eovh1wtxwmjdfw3.m.pipedream.net';
                        console.log('In execute, decoded args: ', decodedArgs);

                        request({
                            url: url,
                            method: "POST",
                            json: {
                                inArg: decoded.inArguments[0],
                                computedWait: waitTime,
                                decoded: decoded
                            },
                        }, function (error, response, body) {
                            if (!error) {
                                console.log(body);
                            }
                        });
                    }).catch(err => {

                    console.error('Error in execute method: ', err);
                    return res.status(500).end();
                });
            }


            //logData(req);
            //res.send(200, 'Execute');
        } else {
            console.error('inArguments invalid.');
            return res.status(400).end();
        }
    });
};


/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, '{"Success":true}');
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Validate');
};
