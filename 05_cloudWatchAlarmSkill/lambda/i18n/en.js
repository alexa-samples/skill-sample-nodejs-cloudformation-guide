
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

module.exports = {
    translation : {
        'welcome' : [
            'Welcome!'
        ],
        'error-prompt' : [
            'Which kind of error do you want to trigger: Time-out, invalid response, or runtime exception?'
        ],
        'error-help' : [
            'A time-out error is when the Lambda function takes too long to respond. <break time="300ms"/>'
            + 'An invalid response is when the Alexa Service reveices a response with unexpected properties. <break time="300ms"/>'
            + 'A runtime exception is when a bug in the Lambda code prevents it from completing the execution. <break time="300ms"/>'
        ],
        'error-reject' : [
            'This is not a supported error type.'
        ],
        'error-confirm' : [
            'Certainly!  <break time="500ms"/>',
            'As you wish!  <break time="500ms"/>',
            'Alright!  <break time="500ms"/>',
        ],
        'error-sound' : [
            '<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01"/>',
        ],
        'goodbye-default' : [
            'Bye!'
        ],
        'goodbye-error' : [
            'Sorry, something went wrong. Please try again later.'
        ],
    },
};
