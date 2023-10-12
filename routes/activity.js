'use strict';
var util = require('util');
const moment = require('moment-timezone');

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
        host: req.host,
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
    console.log("host: " + req.host);
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
    res.send(200, 'Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
    function computeWaitTime(decoded) {
        let date;
        const inArgs = decoded.inArguments[0] || {};
        for (let uc of (inArgs.userConfig || [])) {
            const eachConditionResults = (uc.dynamicAttribute || []).map(da => {
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
                    case 'on':
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
                    if (extendedDate.isBefore(date)) {
                        date = extendedDate;
                    }
                    console.log('date after extend logic: ', date.toString());
                }

                /* breaking as the first matched condition is taken and rest are ignored */
                break;
            }
        }// loop ends
        return date;
    }

    JWT(req.body, process.env.jwtSecret, (err, decoded) => {

        // verification error -> unauthorized request
        if (err) {
            console.error(err);
            return res.status(401).end();
        }

        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {

            /* determine the wait date time */
            const waitTime = computeWaitTime(decoded);

            /* TODO: write it back to the Data Extension as attribute */


            // decoded in arguments
            var decodedArgs = decoded.inArguments[0];
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
