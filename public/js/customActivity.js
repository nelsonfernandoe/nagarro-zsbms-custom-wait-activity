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
        var eventDefinitionKey;

        var currentStep = steps[0].key;


        $(window).ready(onRender);

        connection.on('requestedSchema', handelSchema)
        connection.on('initActivity', initialize);
        connection.on('requestedTokens', onGetTokens);
        connection.on('requestedEndpoints', onGetEndpoints);
        connection.on('requestedTriggerEventDefinition', onRequestedTriggerEventDefinition);
        connection.on('clickedNext', save);
        //connection.on('requestedInteraction', onRequestedInteraction);
        //connection.on('requestedDataSources', onRequestedDataSources);


        /* for local data mocking */
        let local;
        const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
        console.log({isLocal});

        if (isLocal) {
            preLocalSetup();
            postLocalSetup();
            handelSchema(local.schema);
        }

        /* local: ends */

        function onRender() {
            // JB will respond the first time 'ready' is called with 'initActivity'
            console.log('On render events:');

            connection.trigger('ready');
            connection.trigger('requestTokens');
            connection.trigger('requestEndpoints');
            connection.trigger('requestSchema');
            connection.trigger('requestTriggerEventDefinition');

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
            reloadUserConfig();
        }


        function onRequestedInteraction(interaction) {
            console.log('*** requestedInteraction ***');
            console.log(interaction);
        }

        function initialize(data) {
            console.log('initialize started: ', data);
            if (data) {
                payload = data;
            }


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
            };

            /* validate the operand */
            (config[0].dynamicAttribute || []).forEach((da, i) => {
                if (!da.operand) {
                    res.valid = false;
                    res.errorMsgs.push(`${i + 1} Dynamic attribute value cannot be empty`);
                }
            });

            if (!res.valid) {
                $('#modalTitle').text(`Invalid configuration (Group ${group})`);
                let errorMsgHtml = res.errorMsgs.map(e => `<li>${e}</li>`);
                $('#modalBody').html(`<p>Following are the errors:</p><ul>${errorMsgHtml}</ul>`);
                $('#infoModal').modal('show');
            }
            return res.valid;
        }

        function parseUserConfig() {
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
                let dateAttExtendTime = $(`#dateAtt-extend-time-${i}`).val();

                /* Add to array of configs */
                userConfig.push({
                    dynamicAttribute: [{
                        property: dynamicAttProp,
                        operator: dynamicAttOp,
                        operand: dynamicAttOperand
                    }],
                    dateAttribute: {
                        property: dateAttProp,
                        duration: dateAttDuration,
                        unit: dateAttUnit,
                        timeline: dateAttTimeline,
                        timeZone: dateAttTz,
                        extendWait: dateAttExtendWait,
                        extendTime: dateAttExtendTime
                    }
                });

                if (!validateConfig(userConfig.slice(-1), i)) {
                    break;
                }
            }
            console.log({userConfig});

            return userConfig;
        }

        function reloadUserConfig() {
            // var newData = handelSchema();

            var hasInArguments = Boolean(
                payload['arguments'] &&
                payload['arguments'].execute &&
                payload['arguments'].execute.inArguments &&
                payload['arguments'].execute.inArguments.length > 0
            );

            var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

            $.each(inArguments, function (index, inArgument) {
                const userConfigs = inArgument.userConfig || [];
                $.each(userConfigs, function (index, userConfig) {
                    if (index != 0) {
                        addGroup();
                    }
                })
            });

            /* update UI dropdowns from schema */
            $(".attribute-select").html('');
            $(".attibute-date").html('');
            for (var i = 0; i < schemadata.schema.length; i++) {
                //  getattributes.push(schema.schema[i].name);
                $(".attribute-select").append('<option value="' + schemadata.schema[i].name + '">' + schemadata.schema[i].name + '</option>');
                if (schemadata.schema[i].type == 'Date') {
                    $(".attibute-date").append('<option value="' + schemadata.schema[i].name + '">' + schemadata.schema[i].name + '</option>');
                }
            }


            /* based on the payload config, repopulate the UI */
            $.each(inArguments, function (index, inArgument) {
                const userConfigs = inArgument.userConfig || [];

                $.each(userConfigs, function (index, userConfig) {
                    console.log({index, userConfig});
                    let pos = index + 1;

                    /* populate the values */
                    let dynamicAttribute = userConfig.dynamicAttribute[0];
                    $(`#dynamicAtt-prop-${pos}`).val(dynamicAttribute.property);
                    $(`#dynamicAtt-op-${pos}`).val(dynamicAttribute.operator);
                    $(`#dynamicAtt-operand-${pos}`).val(dynamicAttribute.operand);

                    $(`#dateAtt-prop-${pos}`).val(userConfig.dateAttribute.property);
                    $(`#dateAtt-duration-${pos}`).val(userConfig.dateAttribute.duration);
                    $(`#dateAtt-unit-${pos}`).val(userConfig.dateAttribute.unit);
                    $(`#dateAtt-timeline-${pos}`).val(userConfig.dateAttribute.timeline);
                    $(`#dateAtt-tz-${pos}`).val(userConfig.dateAttribute.timeZone);
                    $(`#dateAtt-extend-${pos}`).prop('checked', userConfig.dateAttribute.extendWait).change();
                    $(`#dateAtt-extend-time-${pos}`).val(userConfig.dateAttribute.extendTime);

                    /* to activate tab1 */
                    $(".dynamic-tabs1").css('display', 'none');
                    $(".dynamic-tabs1").removeClass('active');
                    $(".dynamicgroup").removeClass('active');
                    $("#v-pills-dynamic1-tab").addClass('active');
                    // $('#v-pills-dynamic' + grouplength).addClass('active');
                    $("#v-pills-dynamic1").addClass('show active');
                    $("#v-pills-dynamic1").css('display', 'block');
                });
            });
        }

        function getInArgFromConfig(userConfigs) {
            const inArgs = [];
            userConfigs.forEach(uc => {
                (uc.dynamicAttribute || []).forEach(da => {
                    inArgs.push(da.property);
                });
                inArgs.push(uc.dateAttribute.property);
            });
            return inArgs.map(ia => `{{Event.${eventDefinitionKey}.ia}}`);
        }

        function save() {
            const userConfig = parseUserConfig();

            const inArgs = getInArgFromConfig(userConfig);
            payload['arguments'].execute.inArguments = [{
                tokens: authTokens,
                userConfig,
                ...inArgs,
            }];

            payload['metaData'].isConfigured = true;

            console.log('Save done: ', {payload});
            connection.trigger('updateActivity', payload);
        }

        function onRequestedTriggerEventDefinition(eventDefinitionModel) {
            if (eventDefinitionModel) {
                eventDefinitionKey = eventDefinitionModel.eventDefinitionKey;
                console.log(">>>Event Definition Key " + eventDefinitionKey);
                /*If you want to see all*/
                console.log('>>>Request Trigger',
                    JSON.stringify(eventDefinitionModel));
            }

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

        function preLocalSetup() {
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

            /* this is for local test */
            $(document).on('click', '#done', function (event) {
                // save();
                parseUserConfig();
            });


        }

        function postLocalSetup() {
            initialize({
                    arguments: {
                        execute: {
                            inArguments: [
                                {
                                    userConfig: [
                                        {
                                            "dynamicAttribute": [{
                                                "property": "LastName",
                                                "operator": "gt",
                                                "operand": "Henry"
                                            }],
                                            "dateAttribute": {
                                                "property": "LoginDate",
                                                "duration": "2",
                                                "unit": "week",
                                                "timeline": "3",
                                                "timeZone": "Indian/Maldives",
                                                "extendWait": true,
                                                "extendTime": "03:30 AM"
                                            }
                                        },
                                        {
                                            "dynamicAttribute": [{
                                                "property": "FirstName",
                                                "operator": "le",
                                                "operand": "Johny"
                                            }],
                                            "dateAttribute": {
                                                "property": "LogoutDate",
                                                "duration": "4",
                                                "unit": "month",
                                                "timeline": "2",
                                                "timeZone": "Asia/Calcutta",
                                                "extendWait": false,
                                                "extendTime": ""
                                            }
                                        },
                                        {
                                            "dynamicAttribute": [{
                                                "property": "FirstName",
                                                "operator": "eq",
                                                "operand": "Pro"
                                            }],
                                            "dateAttribute": {
                                                "property": "LogoutDate",
                                                "duration": "4",
                                                "unit": "month",
                                                "timeline": "2",
                                                "timeZone": "Australia/Melbourne",
                                                "extendWait": true,
                                                "extendTime": "04:45 PM"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            );
        }
    }
)
;