'use strict';
var util = require('util');
const moment = require('moment-timezone');
const apiService = require('./sfmc-api-service');

// Deps
const Path = require('path');
const JWT = require(Path.join(__dirname, '..', 'lib', 'jwtDecoder.js'));
var util = require('util');
var http = require('https');

let useDEColumnForWaitTime = false;

exports.logExecuteData = [];

function logData(req) {
    /* exports.logExecuteData.push({
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
     console.log("originalUrl: " + req.originalUrl);*/
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

    // const dt = moment(new Date());
    // console.log({dt: dt.toString()});
    // dt.tz('America/New_York');
    // console.log({dt: dt.toString()});

    // apiService.exitContact('Testing custom activity N v2', 'johna@gmail.com');

    res.status(200).send('Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
    function computeWaitTime(decoded) {
        console.log('Computing wait time...');
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
        console.log('Wait time computed: ', {date});
        if (date) {
            date.tz('America/New_York');
            console.log('Final wait time computed after tz change: ', {date});
            console.log('Final wait time computed formatted in tz: ', {formatted: date.format('M/D/YYYY hh:mm:ss A')});
            return date.format('M/D/YYYY hh:mm:ss A');
        } else {
            return date;
        }
    }

    JWT(req.body, process.env.jwtSecret, (err, decoded) => {

        // verification error -> unauthorized request
        if (err) {
            console.error(err);
            return res.status(401).end();
        }

        function postToPipeDream(waitTime) {
            var request = require('request');
            var url = 'https://eovh1wtxwmjdfw3.m.pipedream.net';
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
                    console.log('Response of PipeDream: ', body);
                }
            });
        }

        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
            const decodedArgs = decoded.inArguments[0];

            /* determine the wait date time */
            const waitTime = computeWaitTime(decoded);

            let path;
            if (waitTime) {
                path = 'wait_path';
                console.log('Path selected: ', path);
                const responseObject = {"waitTime": waitTime};
                console.log('Response object to JB: ', JSON.stringify(responseObject));
                res.status(200).json(responseObject);

            } else {
                path = 'reminder_path';
                console.log('Path selected: ', path);
                apiService.exitContact(decodedArgs.activityInfo.journeyName, decoded.keyValue)
                    .then(res => {
                        console.log('Contact exited successfully');
                        res.status(500).json({});
                    }).catch(e => {
                    console.log('Error in exiting the contact.');
                });
            }

            if (waitTime && useDEColumnForWaitTime) {
                console.log('Saving wait time...');
                apiService.saveWaitTime(waitTime, decoded)
                    .then(resp => {
                        // postToPipeDream(waitTime);
                    }).catch(err => {
                    console.error('Error in execute method: ', err);
                    return res.status(500).end();
                });
            } else {
                // postToPipeDream(waitTime);
            }

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

exports.createColumn = async function (req, res) {
    console.log('Create a DE column req: ', req.body);
    const body = req.body;
    const fieldName = body.fieldName;
    const deName = body.deName;
    console.log('Create a DE column inputs: ', {fieldName, deName});
    if (!fieldName || !deName) {
        res.status(400).send('Bad request');
    }
    try {
        await apiService.createColumn(fieldName, deName);
        console.log('Column created');
        res.status(200).send();
    } catch (err) {
        console.log('Error when creating a Column');
        res.status(500).send();
    }
};
