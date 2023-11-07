const axios = require('axios');
const xml2js = require('xml2js');
const {insights} = require("@salesforce-ux/design-system/design-tokens/dist/bg-standard.common");

const ENV_SUB_DOMAIN = process.env.SUB_DOMAIN;
const ENV_CLIENT_ID = process.env.CLIENT_ID;
const ENV_CLIENT_SECRET = process.env.CLIENT_SECRET;
const ENV_MID = process.env.MID;

exports.saveWaitTime = async function (waitTime, decoded) {
    console.log('Save WAIT TIME called: ', {waitTime, decoded});

    const inArgs = decoded.inArguments[0] || {};
    const activityInfo = inArgs.activityInfo;
    try {
        if (!isAuthenticated()) {
            await authenticate();
        }
    } catch (e) {
        console.error("Error when authenticating: ", e);
        throw e;
    }

    if (activityInfo) {
        activityInfo.activityId = decoded.activityId;
        activityInfo.activityInstanceId = decoded.activityInstanceId;
        const colName = activityInfo.waitTimeColumnName;
        // const colName = getWaitTimeColName(decoded.activityInstanceId);

        const data = [{
            keys: {
                [activityInfo.dataExtensionPrimaryKey]: decoded.keyValue
            },
            values: {
                [colName]: waitTime
            }
        }];
        try {
            await upsertDE(activityInfo, data);
        } catch (e) {
            console.error("Error when upserting DE: ", e);
        }
    }

    return true;
};


async function upsertDE(activityInfo, data, isSecondTime) {
    console.log('Upsert DE data: ', {activityInfo, data, isSecondTime});
    const deId = activityInfo.dataExtensionId;
    const deName = activityInfo.dataExtensionName;
    const activityInstanceId = activityInfo.activityInstanceId;
    const accessToken = getAccessToken();
    try {
        const response = await axios
            .post(`https://${ENV_SUB_DOMAIN}.rest.marketingcloudapis.com/hub/v1/dataevents/${deId}/rowset`,
                data,
                {
                    headers: {
                        'content-type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                    }
                });
        console.log('  `-- Upsert success. Response: ', response.data);

    } catch (error) {
        console.error('Error in upsert rest api: ', error.response.data);
        const errRes = error.response.data;
        let isFieldNotAvailableError = (errRes.additionalErrors || []).some(ae => ae.errorcode === 10000);
        if (errRes.errorcode === 10006 && isFieldNotAvailableError && !isSecondTime) {
            const colName = activityInfo.waitTimeColumnName;
            // const colName = getWaitTimeColName(activityInstanceId);
            await createDEFieldSOAP(colName, deName);
            await upsertDE(activityInfo, data, true);
        } else {
            throw  new Error(errRes);
        }
    }
}

function getAccessToken() {
    return process.env.ACCESS_TOKEN;
}

async function createDEFieldSOAP(fieldName, deName) {
    console.log('Creating field in DE via SOAP:', {fieldName, deName});
    const deExternalKey = await getDECustomerKeySOAP(deName);
    const accessToken = getAccessToken();

    const body = `<?xml version="1.0" encoding="UTF-8"?>
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <s:Header>
        <a:Action s:mustUnderstand="1">Update</a:Action>
        <a:To s:mustUnderstand="1">https://${ENV_SUB_DOMAIN}.soap.marketingcloudapis.com/Service.asmx</a:To>
        <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
    </s:Header>
    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">

        <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <Options /> 
            <Objects xsi:type="ns1:DataExtension" xmlns:ns1="http://exacttarget.com/wsdl/partnerAPI">
                <CustomerKey>${deExternalKey}</CustomerKey> 
                <Fields>
                    <Field>
                        <Name>${fieldName}</Name> 
                        <FieldType>Date</FieldType>
                        <IsRequired>false</IsRequired>
                    </Field>
                </Fields>
            </Objects>
        </UpdateRequest>
    </s:Body>
</s:Envelope>`;

    try {
        const resp = await axios
            .post(`https://${ENV_SUB_DOMAIN}.soap.marketingcloudapis.com/Service.asmx`,
                body, {headers: {'content-type': 'text/xml'}}
            );
        console.log('  `-- Add DE Column res: ', resp.data);
        const json = await xml2js.parseStringPromise(resp.data);
        const response = json['soap:Envelope']['soap:Body'][0]['UpdateResponse'][0];
        if (response.OverallStatus[0] !== 'OK') {
            throw new Error("SOAP response failed");
        }
        return true;
    } catch (error) {
        console.error('Add column SOAP API Failed. ', error.response);
        throw error;
    }
}

async function getDECustomerKeySOAP(deName) {
    console.log('Getting customer key via SOAP: ', {deName});
    let customerKey;
    const accessToken = getAccessToken();

    const body = `<?xml version="1.0" encoding="UTF-8"?>
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <s:Header>
            <a:Action s:mustUnderstand="1">Retrieve</a:Action>
            <a:To s:mustUnderstand="1">https://${ENV_SUB_DOMAIN}.soap.marketingcloudapis.com/Service.asmx</a:To>
            <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
                <RetrieveRequest>
                    <ObjectType>DataExtension</ObjectType>
                    <Properties>ObjectID</Properties>
                    <Properties>CustomerKey</Properties>
                    <Properties>Name</Properties>
                    <Filter xsi:type="SimpleFilterPart">
                        <Property>Name</Property>
                        <SimpleOperator>equals</SimpleOperator>
                        <Value>${deName}</Value>
                    </Filter>
                </RetrieveRequest>
            </RetrieveRequestMsg>
        </s:Body>
    </s:Envelope>`;

    try {
        const resp = await axios
            .post(`https://${ENV_SUB_DOMAIN}.soap.marketingcloudapis.com/Service.asmx`,
                body, {headers: {'content-type': 'text/xml'}}
            );
        console.log('  `-- Get DE External key res: ', resp.data);
        const json = await xml2js.parseStringPromise(resp.data);
        console.log(json);
        const response = json['soap:Envelope']['soap:Body'][0]['RetrieveResponseMsg'][0];
        if (response.OverallStatus[0] === 'OK') {
            customerKey = response.Results[0]['CustomerKey'];
        } else {
            throw new Error("SOAP response failed");
        }
        console.log('  `-- DE Ext key: ', customerKey);
    } catch (error) {
        console.error('Getting DE Ext key failed.. ', error.response.data);
        throw error;
    }
    return customerKey;
}

/*function getDEId(eventKey) {
    axios
        .get(`https://${ENV_SUB_DOMAIN}.rest.marketingcloudapis.com/interaction/v1/eventDefinitions/key:${eventKey}`)
        .then(function (response) {
            console.log('get DE id res: ', response.data);

        }).catch(function (error) {
        console.error(error);
    });
}*/

function isAuthenticated() {
    console.log('Checking is authenticated..');
    const currentTime = new Date();
    const expiryTime = new Date(process.env.TOKEN_TTL);

    let accessToken = getAccessToken();
    console.log('  `-- ACCESS_TOKEN = ', !!accessToken);
    console.log('  `-- Current date = ', currentTime);
    console.log('  `-- Token expiry date = ', expiryTime);
    let isAuthenticated = accessToken && currentTime.getTime() < expiryTime.getTime();
    console.log('  `-- is authenticated? Result = ', isAuthenticated)
    return isAuthenticated;
}

async function authenticate() {
    console.log('Authenticating using REST API..');
    try {
        const response = await axios.post(`https://${ENV_SUB_DOMAIN}.auth.marketingcloudapis.com/v2/token`, {
            grant_type: "client_credentials",
            client_id: ENV_CLIENT_ID,
            client_secret: ENV_CLIENT_SECRET,
            account_id: ENV_MID
        }, {
            headers: {
                'content-type': 'application/json'
            }
        });
        console.log('  `-- Authentication successful. Response: ', response.data);
        const expiresIn = response.data.expires_in || 0;
        const ttl = new Date(new Date().getTime() + (1000 * (expiresIn - 60)));
        console.log('  `-- TTL: ', ttl);
        process.env.ACCESS_TOKEN = response.data.access_token;
        process.env.TOKEN_TTL = ttl;
        console.log('  `-- Env values set up as below:');
        console.log('    `-- ACCESS_TOKEN:', getAccessToken());
        console.log('    `-- TOKEN_TTL:', process.env.TOKEN_TTL);
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}

function getWaitTimeColName(activityInstanceId) {
    return `wait_time_${activityInstanceId}`;
}

exports.createColumn = async function (fieldName, deName) {
    if (!isAuthenticated()) {
        await authenticate();
    }
    await createDEFieldSOAP(fieldName, deName);
};


exports.exitContact = async function (journeyName, contactKey) {
    console.log('Exiting contact logic started..', {journeyName, contactKey});

    if (!journeyName || !contactKey) {
        throw new Error('Journey name or contact key is invalid.');
    }

    if (!isAuthenticated()) {
        await authenticate();
    }

    try {
        const journeyKey = await getJourneyKey(journeyName);

        const accessToken = getAccessToken();
        const data = [
            {
                "ContactKey": contactKey,
                "DefinitionKey": journeyKey
            }
        ];
        const response = await axios
            .post(`https://${ENV_SUB_DOMAIN}.rest.marketingcloudapis.com/interaction/v1/interactions/contactexit`,
                data,
                {
                    headers: {
                        'content-type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                    }
                });
        if (response.data.errors && response.data.errors.length === 0) {
            console.log('  `-- Contact exit success. Response: ', response.data);
        } else {
            console.log('  `-- Error in response from exit contact api.', response.data);
        }

    } catch (error) {
        console.error('Error in exit contact rest api: ', error.response.data);
        throw  new Error(error);
    }
};

async function getJourneyKey(journeyName) {
    const accessToken = getAccessToken();
    try {
        const resp = await axios
            .get(`https://${ENV_SUB_DOMAIN}.rest.marketingcloudapis.com/interaction/v1/interactions/?name=${journeyName}`,
                {headers: {Authorization: `Bearer ${accessToken}`}});
        const respData = resp.data;
        if (respData && respData.items && respData.items[0] && respData.items[0].key) {
            return respData.items[0].key;
        } else {
            throw new Error('Unexpected repsonse for journey key api.');
        }
    } catch (error) {
        console.error('Error in getJourneyKey api: ', error);
        throw error;
    }
}