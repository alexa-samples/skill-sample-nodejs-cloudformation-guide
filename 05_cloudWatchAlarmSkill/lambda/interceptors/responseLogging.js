
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

const _get = require('lodash.get');

module.exports = {
    process(handlerInput) {
        // For debugging purposes, we might be fine with logging only the
        // output speech, e.g. to be able to inspect it for malformed SSML.
        // If we use more complex output, e.g. APL directives, those might
        // be worth logging too.
        const responseContent = _get(
            handlerInput.responseBuilder.getResponse(),
            'outputSpeech.ssml'
        ) || _get(
            handlerInput.responseBuilder.getResponse(),
            'outputSpeech.text'
        );
        console.log(`Response text: ${responseContent}`);
    }
};
