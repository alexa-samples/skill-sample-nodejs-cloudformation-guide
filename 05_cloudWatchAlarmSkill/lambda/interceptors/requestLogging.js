
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

const _get = require('lodash.get');

// We use relatively extensive logging in order to be able to reproduce potential errors.
// We only log the full request envelope for the first request of a session, and
// afterwards only the request objects. To enable searching for user sessions, we
// add a bit of a hack by extracting the session ID and adding it as  property of the
// request object.
module.exports = {
    process(handlerInput) {
        if (
            _get(handlerInput, 'requestEnvelope.session.new')
        ) {
            // We need most of the attributes of the request envelope only
            // once, since they don't change during one session.
            console.log(`Request envelope: ${
                JSON.stringify(handlerInput.requestEnvelope, null, 4)
            }`);
        } else {
            // This is a bit of a hack, but it will make debugging easier for you:
            // First extract the session ID, then add it as an attribute of the
            // request object for logging purposes
            const sessionId = _get(handlerInput, 'requestEnvelope.session.sessionId')
            let requestObject = _get(handlerInput, 'requestEnvelope.request');
            requestObject.sessionId = sessionId;

            console.log(`Request object: ${JSON.stringify(requestObject, null, 4)}`);
        }
    }
};
