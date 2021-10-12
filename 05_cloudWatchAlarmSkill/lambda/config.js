
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

module.exports = {
    // In this case all config variables are imported from Lambda
    // environment variables, and are set in the CloudFormation
    // template. You can instead use dummy values in the template, and
    // set your config variables here.
    errorNotification: {
        // The ARN of the SNS topic for error messages which
        // we created in CloudFormation
        arn: process.env.NOTIFICATION_ARN,
        // The subject of the email with the error message
        subject: process.env.NOTIFICATION_SUBJECT,
        // AWS region and CloudWatch log group name are used
        // to generate the log stream URL in the error message
        logGroupRegion: process.env.LOG_GROUP_REGION,
        logGroupName: process.env.LOG_GROUP_NAME,
    },
    // Debug mode can be either 'true' or 'false', since these are the
    // only allowed values in the CloudFormation template. This line
    // converts this environment variable string to a boolean
    debugMode: String(process.env.DEBUG_MODE).toLowerCase().trim() === 'true',
};
