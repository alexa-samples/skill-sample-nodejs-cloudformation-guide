
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

const i18n = require('i18next');

const translationStrings = require('../i18n');

// This is the regular localization request interceptor
module.exports = {
    process(handlerInput) {
        i18n.init(
            {
                lng: handlerInput.requestEnvelope.request.locale,
                resources: translationStrings,
                returnObjects: true,
            }
        ).then(
            (t) => {
                handlerInput.t = (key, parameters={}) => {
                    const target = t(key, parameters);
                    const value = Array.isArray(target) 
                        ? target[Math.floor(Math.random() * target.length)]
                        : target;
                    return value;
                };
            }
        );
    }
};
