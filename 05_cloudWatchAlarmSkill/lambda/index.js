
/**
 * Copyright 2020 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * 
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 * 
 * http://aws.amazon.com/asl/
 * 
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
**/

const Alexa = require('ask-sdk-core');
const _get = require('lodash.get');

const config = require('./config');
const interceptor = require('./interceptors');
const errorNotification = require('./errorNotification');
const progressiveResponse = require('./progressiveResponse');

// Launch request handler is only used for launch requests opposed to all new session
// requests that aren't handled by any other handler to improve readability
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        // Prompt is used for both response and reprompt,
        // and therefore gets an own variable
        const prompt = handlerInput.t('error-prompt');

        // Welcome text is only used in response text, so we don't need a variable
        return handlerInput.responseBuilder
            .speak(`${
                handlerInput.t('welcome')
            } ${
                prompt
            }`)
            .reprompt(prompt)
            .getResponse();
    }
};

// Timeout intent handler is for when the user wants to get a timeout error, as they
// would get if the endpoint took too long to respond. The handler also sends a
// progressive response to show the user that the following error message is intended.
const TimeoutIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TimeoutIntent';
    },
    async handle(handlerInput) {

        // Error confirmation is sent as progressive response
        const confirmation = handlerInput.t('error-confirm');
        progressiveResponse.send(handlerInput, confirmation);

        // An asynchronous timeout of 8 seconds suffices to create a timeout error
        await sleep(8000);

        // This part will be sent too late and be rejected by the Alexa Service
        return handlerInput.responseBuilder
            .speak(confirmation)
            .getResponse();
    }
};

// Invalid response intent handler is for when the user wants to get an invalid response
// error, as they would get if SSML is misformed. The handler also sends a progressive
// response to show the user that the following error message is intended.
const InvalidResponseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InvalidResponseIntent';
    },
    async handle(handlerInput) {

        // Error confirmation is sent as progressive response
        const confirmation = handlerInput.t('error-confirm');
        progressiveResponse.send(handlerInput, confirmation);

        // A short asynchronous timeout makes sure that the progressive
        // response arrives before the response with the misformed SSML
        await sleep(1000);

        // <break target="session"/> is not valid SSML and will raise an error
        return handlerInput.responseBuilder
            .speak(`${
                confirmation
            } <break target="session"/>`)
            // Alternatively, comment the above speak() call and uncomment the one below
            // to get an error for an invalid mp3 file. 
            // .speak(
            //     '<audio src="https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3"/>'
            // )
            .getResponse();
    }
};

// Runtime error intent handler is for when the user wants to get a runtime error.
// This is the only kind of error used here that triggers the 'ErrorHandler' and
// emits a debug message.
const RuntimeErrorIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RuntimeErrorIntent';
    },
    async handle(handlerInput) {

        // Error confirmation is sent as progressive response
        const confirmation = handlerInput.t('error-confirm');
        progressiveResponse.send(handlerInput, confirmation);

        // A short asynchronous timeout makes sure that the progressive
        // response arrives before the response with the misformed SSML
        await sleep(1000);

        // Oh no, the fragileObject object has no .break() method!
        const fragileObject = {};
        fragileObject.break();

        // This will not be emitted and is only included for completeness
        return handlerInput.responseBuilder
            .speak(confirmation)
            .getResponse();
    }
};

// A simple help intent handler
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const prompt = handlerInput.t('error-prompt');
        return handlerInput.responseBuilder
            .speak(`${
                handlerInput.t('error-help')
            } ${
                prompt
            }`)
            .reprompt(prompt)
            .getResponse();
    }
};

// A simple fallback intent handler
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const prompt = handlerInput.t('error-prompt');
        return handlerInput.responseBuilder
            .speak(`${
                handlerInput.t('error-reject')
            } ${
                prompt
            }`)
            .reprompt(prompt)
            .getResponse();
    }
};

// A simple handler for stop and cancel intent
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(
                handlerInput.t('goodbye-default')
            )
            .getResponse();
    }
};

// For some error types, you only learn about the error from a SessionEndedRequest
// with the 'ERROR' reason. In this case, the error notification is sent for the
// SessionEndedRequest, but to identify the error you'll have to investigate the
// logs for the preceding turn of the session (by searching for the sessionId,
// presumably in the same CloudWatch log group).
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        if (
            _get(handlerInput.requestEnvelope, 'request.reason') === 'ERROR'
        ) {
            errorNotification.start(
                handlerInput,
                `*Error type:* \`${
                    _get(handlerInput.requestEnvelope, 'request.error.type')
                }\`\n*Error message:* \`${
                    _get(handlerInput.requestEnvelope, 'request.error.message')
                }\``
            );
        }
        
        return handlerInput.responseBuilder.getResponse();
    }
};

// The error handler gets invoked if an error occurs in another handler,
// similar to a catch block. It's a natural place from where to send an error
// notification, and on top we can make Alexa say the error message and it's location.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        
        // For reference, this is the part of the error object we're working with,
        // after splitting the stack property at line breaks:
        // {
        //    message: 'fragileObject.break is not a function',
        //    stack: [
        //      'TypeError: fragileObject.break is not a function',
        //      'at Object.handle (/var/task/index.js:104:28)',
        //      ...
        //    ],
        // }

        const stack = error.stack.split('\n');

        // We're using this regex to extract the parts 'index.js' and '104' from
        // the string 'at Object.handle (/var/task/index.js:104:28)'. This will work
        // with errors in different files as well.
        let errorLocation = stack[1].match(/\/([a-zA-Z0-9_\-\.]+):(\d+):\d+/);
        console.log(`Error location match: ${
            JSON.stringify(errorLocation, null, 4)
        }`);

        // Default error response is a 'negative' sound, but for a live Skill it could
        // be an apology, or a request to try again later.
        let speakOutput = handlerInput.t('error-sound');

        // If debug mode is enabled and we could extract the error location from the
        // error stack, we can make Alexa say the error message and its location
        if(
            config.debugMode
            && errorLocation
        ) {
            // We're using English language SSML, because the error messages are
            // always in English
            speakOutput = `<lang xml:lang="en-US">${
                error.message
            } <break time='200ms'/> Check ${
                errorLocation[1]
            }, line ${
                errorLocation[2]
            }</lang>`;
        }

        // We're sending an error notification irrespecitve of whether we use debug mode
        errorNotification.start(
            handlerInput,
            `*Error:* \`\`\`${
                error.stack
            }\`\`\``
        );

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// Initializing the SkillBuilders object as usual. It should work with the standard
// Skill Builder just as well, but we use the custom one to have less dependencies.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        InvalidResponseIntentHandler,
        TimeoutIntentHandler,
        RuntimeErrorIntentHandler,
        HelpIntentHandler,
        FallbackIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addRequestInterceptors(
        interceptor.requestLogging,
        interceptor.localization,
    )
    .addResponseInterceptors(
        interceptor.responseLogging
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .lambda();

// The asynchronous sleep function is defined here
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}