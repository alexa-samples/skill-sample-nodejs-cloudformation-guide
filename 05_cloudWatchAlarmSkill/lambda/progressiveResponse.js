
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

const Alexa = require('ask-sdk-v1adapter');

// We don't strictly need progressive responses for this repo,
// but they are great for signalling that the following error is
// intended. This implementation is based on 
// https://forums.developer.amazon.com/answers/178482/view.html
module.exports = {
    send: function (handlerInput, speechText) {
        const directiveService = new Alexa.services.DirectiveService();

        const directive = {
            header: {
                requestId: handlerInput.requestEnvelope.request.requestId
            },
            directive: {
                type: 'VoicePlayer.Speak',
                speech: `<speak>${speechText}</speak>`
            }
        };

        return directiveService.enqueue(
            directive,
            handlerInput.requestEnvelope.context.System.apiEndpoint,
            handlerInput.requestEnvelope.context.System.apiAccessToken
        );
    },
};
