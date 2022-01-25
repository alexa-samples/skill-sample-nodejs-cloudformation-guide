/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

const _get = require('lodash.get');
const AWS = require('aws-sdk');

const config = require('./config');

module.exports = {
  start: function (handlerInput, errorDetail) {
    console.log(`Lambda context: ${
      JSON.stringify(handlerInput.context)
    }`);

    // Remove user + device ID, as it's irrelevant for the notification
    const cleanHandlerInput = JSON.stringify(handlerInput.requestEnvelope, null, 4)
      .replace(/(amzn\d\.ask\.account)\.([A-Z0-9]+)/g, '$1.userId')
      .replace(/(amzn\d\.ask\.device)\.([A-Z0-9]+)/g, '$1.deviceId')
      .replace(/("apiAccessToken"): "(\S*)"/g, '$1: "placeholderToken"');

    // Start and end times for CloudWatch Insight queries. End time is the current
    // server time, and start time is one hour before
    const queryEndTime = new Date();
    const queryStartTime = new Date(
      queryEndTime.getTime() - 3600000,
    );

    // Include information from handlerInput in error message to make it easier to
    // trace the error in CloudWatch logs. The '%' around key names are deleted
    // in the email message, and replaced by '*' in the Slack message
    const errorMessage = `${
      errorDetail
    }\n\n%Log stream:% \`${
      // You can only search within a selected log stream, so this is useful to know
      _get(handlerInput, 'context.logStreamName')
    }\`\n%Log stream URL:% ${
      // This URL will take you directly to the log group. It uses an AWS-specific
      // URL-encoding for special characters like '/', '$' and square brackets.
      // Kudos to Pål Brattberg for this solution: https://stackoverflow.com/a/62746938
      `https://console.aws.amazon.com/cloudwatch/home?region=${
        config.errorNotification.logGroupRegion
      }#logsV2:log-groups/log-group/${
        config.errorNotification.logGroupName
          .replace(/\//g, '$252F')
      }/log-events/${
        _get(handlerInput, 'context.logStreamName')
          .replace('$', '$2524')
          .replace('[', '$255B')
          .replace(']', '$255D')
          .replace(/\//g, '$252F')
      }`
    }\n%Session ID:% \`${
      // Session ID is good to identify logs for all interactions of a selected user
      // before the error occurred, e.g. to be able to reproduce it better.
      _get(handlerInput, 'requestEnvelope.session.sessionId')
    }\`\n%Session query URL:% ${
      // Session ID is good to identify logs for all interactions of a selected user
      // before the error occurred, e.g. to be able to reproduce it better.
      `https://console.aws.amazon.com/cloudwatch/home?region=${
        config.errorNotification.logGroupRegion
      }#logsV2:logs-insights$3FqueryDetail$3D$257E$2528end$257E$2527${
        // For the time range, we select the last hour before the error
        // occured. First we format the end time, i.e. the current server time.
        queryEndTime.getUTCFullYear()
      }-${
        // Months are numerated from 0 to 11, so we have to add 1.
        // This also adds padding if the month is single-digit.
        queryEndTime.getUTCMonth() < 10
          ? `0${queryEndTime.getUTCMonth() + 1}`
          : queryEndTime.getUTCMonth() + 1
      }-${
        queryEndTime.getUTCDate() < 10
          ? `0${queryEndTime.getUTCDate()}`
          : queryEndTime.getUTCDate()
      }T${
        queryEndTime.getUTCHours() < 10
          ? `0${queryEndTime.getUTCHours()}`
          : queryEndTime.getUTCHours()
      }*3a${
        queryEndTime.getUTCMinutes() < 10
          ? `0${queryEndTime.getUTCMinutes()}`
          : queryEndTime.getUTCMinutes()
      }*3a59.999Z$257Estart$257E$2527${
        // Now we format the start time (i.e. 1 hour before)
        queryStartTime.getFullYear()
      }-${
        queryStartTime.getMonth() < 10
          ? `0${queryStartTime.getMonth() + 1}`
          : queryStartTime.getMonth() + 1
      }-${
        queryStartTime.getUTCDate() < 10
          ? `0${queryStartTime.getUTCDate()}`
          : queryStartTime.getUTCDate()
      }T${
        queryStartTime.getUTCHours() < 10
          ? `0${queryStartTime.getUTCHours()}`
          : queryStartTime.getUTCHours()
      }*3a${
        queryStartTime.getUTCMinutes() < 10
          ? `0${queryStartTime.getUTCMinutes()}`
          : queryStartTime.getUTCMinutes()
      }*3a00.000Z$257EtimeType$257E$2527ABSOLUTE$257Etz$257E$2527UTC${
        '' // This just serves as a line delimiter for the long template string
      }$257EeditorString$257E$2527fields*20*40message*0a*7c*20filter*20*40message*20like*20*27${
        // This is the target string for the query "filter @message like '...'"
        _get(handlerInput, 'requestEnvelope.session.sessionId')
      }*27$257EisLiveTail$257Efalse$257Esource$257E$2528$257E$2527*2faws*2flambda*2f${
        // This is the target log group, using the Lambda function's
        // name as a context variable
        _get(handlerInput, 'context.functionName')
      }$2529$2529`
    }\`\n%AWS Request ID:% \`${
      // One AWS request ID is unique to one invocation of the Skill's Lambda function,
      // and each logged item in CloudWatch is prefixed with the AWS request ID.
      // This makes the AWS request ID great for finding all logged items for one
      // interaction between the user and the Skill.
      _get(handlerInput, 'context.awsRequestId')
    }\`\n%Error timestamp:% \`${
      // Timestamp can be useful too
      queryEndTime.toISOString()
    }\`\n\n%Handler input:% \`\`\`${
      // Logging the entire handler input in the error message might seem excessive,
      // but in some cases you already know the source of the error by looking at
      // the request object, e.g. sending a directive for an unsupported interface
      cleanHandlerInput
    }`;

    // Publish to SNS
    module.exports.publishToSNS(errorMessage);
  },

  publishToSNS: function (errorMessage) {
    // Email message will be plaintext, so remove Markdown
    const errorMessageClean = removeEmailMarkdown(errorMessage);

    // Parameters are email subject + body and SNS topic ARN
    const notificationParameters = {
      Subject: config.errorNotification.subject,
      Message: errorMessageClean,
      TopicArn: config.errorNotification.arn,
    };

    // Create promise object and use it to send notification
    const publishTextPromise = new AWS.SNS(
      {
        apiVersion: '2010-03-31',
      },
    ).publish(notificationParameters).promise();
    publishTextPromise.then(
      (data) => {
        // Log message ID for debugging purposes
        console.log(`Notification sending result: ${data.MessageId}`);
      },
    ).catch(
      (err) => {
        console.error(`Error upon sending notification:\n${
          err.stack
        }`);
      },
    );
  },
};

function removeEmailMarkdown(text) {
  // Very simple approach to fixing Markdown for email:
  // Just remove all percent characters and backticks
  return text
    .replace(/`/g, '')
    .replace(/%/g, '');
}
