define([
    'postmonger'
], function (
    Postmonger
) {
    'use strict';

    var connection = new Postmonger.Session();
    var authTokens = {};
    var payload = {};
    var lastStepEnabled = false;
    var steps = [{"label": "Configure Postcard", "key": "step1"}];
    var schemadata = {};

    var currentStep = steps[0].key;


    $(window).ready(onRender);

    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);
    connection.on('requestedSchema', handelSchema)
    //connection.on('requestedInteraction', onRequestedInteraction);
    //connection.on('requestedTriggerEventDefinition', onRequestedTriggerEventDefinition);
    //connection.on('requestedDataSources', onRequestedDataSources);

    connection.on('clickedNext', save);

    /* for local data mocking */
    let local;
    const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    console.log({isLocal});

    if (isLocal) {
        localSetup();
        handelSchema(local.schema);
    }

    /* local: ends */

    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');
        connection.trigger('requestSchema')
        //connection.trigger('requestInteraction');
        //connection.trigger('requestTriggerEventDefinition');
        //connection.trigger('requestDataSources');  

    }

    function onRequestedDataSources(dataSources) {
        console.log('*** requestedDataSources ***');
        console.log(dataSources);
    }

    function handelSchema(schema) {
        console.log("####Schema without strignify#####", schema);
        console.log('*** Schema ***', JSON.stringify(schema))
        schemadata = schema;
        // var getattributes = [];
        $(".attribute-select").html('');
        $(".attibute-date").html('');
        for (var i = 0; i < schema.schema.length; i++) {
            //  getattributes.push(schema.schema[i].name);
            $(".attribute-select").append('<option value="' + schema.schema[i].name + '">' + schema.schema[i].name + '</option>');
            if (schema.schema[i].type == 'Date') {
                $(".attibute-date").append('<option value="' + schema.schema[i].name + '">' + schema.schema[i].name + '</option>');
            }
        }

    }


    function onRequestedInteraction(interaction) {
        console.log('*** requestedInteraction ***');
        console.log(interaction);
    }

    function onRequestedTriggerEventDefinition(eventDefinitionModel) {
        console.log('*** requestedTriggerEventDefinition ***');
        console.log(eventDefinitionModel);
    }

    function initialize(data) {
        console.log(data);
        if (data) {
            payload = data;
        }
        // var newData = handelSchema();

        // console.log("$$$$$$$$$$$$ New Data coming $$$$$$$",JSON.stringify(newData));

        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        console.log(inArguments);

        $.each(inArguments, function (index, inArgument) {
            $.each(inArgument, function (key, val) {
                if (key === 'postcardURL') {
                    $('#postcard-url').val(val);
                    $('.postcard - preview - content').css('background - image', "url('" + $('#postcard-url').val());
                }

                if (key === "postcardText")
                    $('#postcard-text').val(val);
                $('#postcard-preview-text').html($('#postcard - text').val());

            });
        });

        connection.trigger('updateButton', {
            button: 'next',
            text: 'done',
            visible: true
        });
    }

    function onGetTokens(tokens) {
        console.log(tokens);
        authTokens = tokens;
    }

    function onGetEndpoints(endpoints) {
        console.log(endpoints);
    }

    function validateConfig(config, group) {
        const res = {
            valid: true,
            errorMsgs: []
        }

        /* validate the operand */
        if (!config[0].dynamicAttribute.operand) {
            res.valid = false;
            res.errorMsgs.push('Dynamic attribute value cannot be empty');
        }

        if (!res.valid) {
            $('#modalTitle').text(`Invalid configuration (Group ${group})`);
            let errorMsgHtml = res.errorMsgs.map(e => `<li>${e}</li>`);
            $('#modalBody').html(`<p>Following are the errors:</p><ul>${errorMsgHtml}</ul>`);
            $('#infoModal').modal('show');
        }
        return res.valid;
    }

    function parseUserConfig() {
        /*
        example config
        let a = [
            {
                dynamicAttribute : {
                    property: {
                        name: 'firstName',
                        type: 'string'
                    },
                    operator: 'equals',
                    operand: 'John'
                },
                dateAttribute: {
                    property: 'scheduledDate',
                    duration: 1,
                    unit: 'day',
                    timeline: 'Before',
                    timeZone: '+5:30'
                }
            }

        ];
        */
        const userConfig = [];
        const totalTabs = $('.removeGroup').length;
        for (let i = 1; i <= totalTabs; i++) {

            /* Read UI values */
            let dynamicAttProp = $(`#dynamicAtt-prop-${i}`).val();
            let dynamicAttOp = $(`#dynamicAtt-op-${i}`).val();
            let dynamicAttOperand = $(`#dynamicAtt-operand-${i}`).val();

            let dateAttProp = $(`#dateAtt-prop-${i}`).val();
            let dateAttDuration = $(`#dateAtt-duration-${i}`).val();
            let dateAttUnit = $(`#dateAtt-unit-${i}`).val();
            let dateAttTimeline = $(`#dateAtt-timeline-${i}`).val();
            let dateAttTz = $(`#dateAtt-tz-${i}`).val();
            let dateAttExtendWait = $(`#dateAtt-extend-${i}`).is(":checked");

            /* Add to array of configs */
            userConfig.push({
                dynamicAttribute: {
                    property: dynamicAttProp,
                    operator: dynamicAttOp,
                    operand: dynamicAttOperand
                },
                dateAttribute: {
                    property: dateAttProp,
                    duration: dateAttDuration,
                    unit: dateAttUnit,
                    timeline: dateAttTimeline,
                    timeZone: dateAttTz,
                    extendWait: dateAttExtendWait
                }
            });

            if (!validateConfig(userConfig.slice(-1), i)) {
                break;
            }
        }
        return userConfig;
    }

    function save() {
        const userConfig = parseUserConfig();

        payload['arguments'].execute.inArguments = [{
            "tokens": authTokens,
            userConfig
        }];

        payload['metaData'].isConfigured = true;

        console.log(payload);
        connection.trigger('updateActivity', payload);
    }

    $(document).on('click', '#addGroup', function (event) {

        console.log("Work inside");
        console.log("Schema data", schemadata);
        $(".attribute-select").html('');
        $(".attibute-date").html('');
        for (var i = 0; i < schemadata.schema.length; i++) {
            $(".attribute-select").append('<option value="' + schemadata.schema[i].name + '">' + schemadata.schema[i].name + '</option>');
            if (schemadata.schema[i].type == 'Date') {
                $(".attibute-date").append('<option value="' + schemadata.schema[i].name + '">' + schemadata.schema[i].name + '</option>');
            }
        }
    });

    $('#btn-preview').click(function () {
        $('#postcard-preview-text').html($('#postcard-text').val());
        $('.postcard-preview-content').css('background-image', "url('" + $('#postcard-url').val() + "')");
    });

    function localSetup() {
        local = {};
        local.schema = {
            "schema": [{
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.EmailAddress",
                "name": "EmailAddress",
                "type": "EmailAddress",
                "length": 254,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }, {
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.FirstName",
                "name": "FirstName",
                "type": "Text",
                "length": 50,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }, {
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.LastName",
                "name": "LastName",
                "type": "Text",
                "length": 50,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }, {
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.PurchaseDate",
                "name": "PurchaseDate",
                "type": "Date",
                "length": null,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }, {
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.LoginDate",
                "name": "LoginDate",
                "type": "Date",
                "length": null,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }, {
                "key": "Event.DEAudience-a0c615e0-764a-73a0-bdd4-e697a16ff4c1.LogoutDate",
                "name": "LogoutDate",
                "type": "Date",
                "length": null,
                "default": null,
                "isNullable": true,
                "isPrimaryKey": null
            }]
        };

        /* events */

        /* TODO: remove for SFMC (this is for local test) */
        $(document).on('click', '#done', function (event) {
            // save();
            parseUserConfig();
        });
    }
});