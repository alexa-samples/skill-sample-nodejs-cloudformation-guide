
# 'Monitoring' (CloudWatch Alarm + SNS) Skill

Within the 'AWS CloudFormation + ASK CLI Guide' repository, this 'monitoring' skill project exemplifies how to set up basic skill monitoring using [CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html) and SNS topic for [email notifications](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html).

This project is based on [this demo repository](https://github.com/alexa-samples/error-notification-sample-skill) for monitoring a skill Lambda with email and Slack notifications.

This README also introduces this concept:
- **Advanced configuration opitions**: Passing sensitive or user-specific data (in this case, the email address for the SNS email topic) to `cfn-deployer` from `ask-resources.json` instead of hard-coding them in `skill-stack.yaml`.


## Prerequisites

To deploy this project, you (i.e. your AWS CLI user) need to have permissions for SNS (in addition to the basic Lambda, CloudWatch and IAM permissions). You can probably get by with fewer permissions, but a convenient selection of managed IAM policies are:
- AmazonSNSFullAccess
- AWSLambda_FullAccess
- CloudWatchFullAccess
- IAMFullAccess


## Advanced configuration options

In this project we're using an SNS email topic to receive mails with error notifications. The recipient email address is passed with the parameter `NotificationEMail` to the `Subscription.Endpoint` property of the `AWS::SNS::Topic` resource:

```
Resources:
  [...]
  AlarmTopic:
    Type: AWS::SNS::Topic
    Properties: 
      Subscription: 
        - Endpoint: !Ref NotificationEMail
          Protocol: email
      TopicName: !Join
        - '-'
        - - !Ref ProjectAlias
          - 'alarmTopic'
```

A naive way to set this up is to include the email address as the `NotificationEMail` parameter's default value in `skill-stack-yaml`. The issue with this 'naive' approach is that it **makes the template less easily shareable** - You'd need to redact your email address before sharing or publishing it. 

An alternative is to save this parameter in `ask-resources.json`, which already contains account-specific details such as `awsRegion` and (optionally) the `artifactsS3` config. When sharing or publishing the skill, you only need to replace `ask-resources.json` with a generic/redacted version.

The way to pass custom parameters and their value to Cfn is by using the `profiles.<default>.skillInfrastructure.userConfig.cfn.parameters` property of `ask-resources.json`, [as documented here](https://github.com/alexa/ask-cli/blob/develop/docs/concepts/Alexa-Skill-Project-Definition.md#project-config-for-resources-management).

These custom parameters keys in `ask-resources.json` need to be identical to their corresponding parameter names in the template `skill-stack.yaml`:

```
[From ask-resources.json]
{
  "askcliResourcesVersion": "2020-03-31",
  "profiles": {
    "default": {
      "skillInfrastructure": {
        "userConfig": {
          "cfn": {
            "parameters": {
              "NotificationEMail": "watcher@example.com"
            }
          }
      }
    }
  }
}
```

```
[From skill-stack.yaml]
AWSTemplateFormatVersion: 2010-09-09
Parameters:
  [...]
  NotificationEMail:
    Type: String
    Description: >
      The email address to which to send notification emails
    AllowedPattern: '([^\s@]+@[^\s@]+\.[^\s@]+)'
```

Note that in the Cfn template, `NotificationEMail` has no default value. You could set up a default parameter, and it would be overridden upon deployment. For clarity, I recommend to omit a default value.

## CloudWatch Alarm

```
Resources:
  [...]
  LambdaAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub ${ProjectAlias}-alarm
      AlarmDescription: !Sub "Error in Lambda '${ProjectAlias}-lambda'"
      AlarmActions:
        - !Ref AlarmTopic
      Namespace: AWS/Lambda
      MetricName: Errors
      Dimensions:
        - Name: FunctionName
          Value: !Ref LambdaFunction
      Statistic: Sum
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Threshold: 1
      EvaluationPeriods: 1
      Period: 60
      TreatMissingData: notBreaching
```

The CloudWatch alarm created in this project is very sensitive, and changes into 'alarm' state after a single 60-second interval with 1 or more Lambda errors. For a live skill project, this might require more fine-tuning to avoid false-positives.

Also note that the CloudWatch Alarm only registers cases in which the Lambda function 'crashes'. The [ASK SDK](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html) provides an [error handler](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/handle-requests.html#error-handlers) to allow more graceful handling of non-fatal errors, however these don't trigger the CloudWatch Alarm.

To cover such non-fatal errors, the skill's lambda code provides an example of how to trigger notification emails from the error and SessionEndedRequest handlers.
