

# Skill deployment without ASK CLI

Within the 'AWS CloudFormation + ASK CLI Cookbook' repository, this project shows how to deploy an Alexa skill without ASK CLI and cfn-deplyoer, i.e. directly with Cfn either in the [Cfn console](https://console.aws.amazon.com/cloudformation/home) or [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/index.html).

This template also features how to use **Cfn Metadata** to provide a structured, well-annotated Cfn console experience.


## Prerequisites

Just as with the ASK CLI projects, you (i.e. your AWS CLI user) need to have permissions for all the services you want to provision in this project - In this case Lambda,  CloudWatch and IAM, and optionally DynamoDB. You can probably get by with fewer permissions, but a convenient selection of managed IAM policies are:
- AmazonDynamoDBFullAccess
- AWSLambda_FullAccess
- CloudWatchFullAccess
- IAMFullAccess


## Cfn's `Alexa::ASK::Skill` resource

Cfn provides [an `Alexa::ASK::Skill` resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ask-skill.html) to set up an Alexa skill in the designated vendor account:

```
Resources:
  [...]
  AlexaSkill:
    Type: Alexa::ASK::Skill
    Properties: 
      SkillPackage:
        S3Bucket: !Ref AskPackageBucket
        S3Key: !Ref AskPackageKey
        S3ObjectVersion: !Ref AskPackageVersion
        Overrides: 
          Manifest: 
            apis: 
              custom: 
                endpoint: 
                  uri: !GetAtt LambdaFunction.Arn 
      AuthenticationConfiguration: 
        ClientId: !Ref AskClientId
        ClientSecret: !Ref AskClientSecret
        RefreshToken: !Ref AskClientRefreshToken
      VendorId: !Ref AskVendorId
```

You will need to provide a zip archive in S3 with the **skill package**, i.e. the skill manifest and the interaction model for all selected locales. With the `SkillPackage.Overrides` property, you can add the endpoint URI that is provided by the Lambda function within the same template.

The `AuthenticationConfiguration` properties can be a bit tricky to come by:
- You can get `ClientId` and `ClientSecret` from the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask), under "Build > Tools > Permissions". For "Alexa Client Id" and "Alexa Client Secret" to be dispalyed, you might need to temporarily activate the toggle for the "Skill Resumption" permission first.
- The easiest way to get the `RefreshToken` if from your local machine, if you open `~/.ask/auth_info` and copy-paste from there. So much for "deploying without ASK CLI" ;)

## Dummy resources

To facilitate your experimentation with this way of skill deployment, I provide a zipped skill package and Lambda code that you can use:

```
LambdaCodeBucket: cfn-source-eu-west-1
LambdaCodeKey: cfnCookbookDummy.zip
LambdaCodeVersion: eUUqLNIE_pPC16_fb1OpBVRJmZT4qibs
AskPackageBucket: cfn-source-eu-west-1
AskPackageKey: skill-package.zip
AskPackageVersion: zf_ATm8bPpev0g1HMKwrL2Zsn1xhZHvb
```

## Cfn metadata / template mark-up

In your Cfn template file, you can order parameters (and resources, conditions etc, but they are irrelevant wrt metadata), according to your own preference. However, if you upload your template into the [Cfn console](https://console.aws.amazon.com/cloudformation/home), by default parameters get ordered alphabetically.

To amend this and provide more structure, Cfn has [a metadata section](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-interface.html) that allows you to configure `AWS::CloudFormation::Interface` with `ParameterGroups` and additional `ParameterLabels`.

In our case, we use it to group parameters by the resource (type) they correspond to:

```
Metadata:
  'AWS::CloudFormation::Interface':
    ParameterGroups:
      - Label:
          default: Generic parameters
        Parameters:
          - ProjectAlias
          - DebugMode
      - Label:
          default: Lambda configuration
        Parameters:
          - CreateLambdaAliases
          - LambdaTimeout
          - LambdaMemorySize
          - LambdaRuntime
          - LambdaHandler
          - LambdaCodeBucket
          - LambdaCodeKey
          - LambdaCodeVersion
      - Label:
          default: CloudWatch configuration
        Parameters:
          - LogRetention
      - Label:
          default: DynamoDB configuration
        Parameters:
          - CreateDynamoDbDatabase
          - DynamoDbBillingMode
          - DynamoDbReadCapacity
          - DynamoDbWriteCapacity
      - Label:
          default: Alexa Skill configuration
        Parameters:
          - AskPackageBucket
          - AskPackageKey
          - AskPackageVersion
          - AskClientId
          - AskClientSecret
          - AskClientRefreshToken
          - AskVendorId
    ParameterLabels:
      ProjectAlias:
        default: Used as a suffix for physical resource IDs
      DebugMode:
        default: Run the skill in debug mode, i.e. with verbose error messages?
      LogRetention:
        default: How many days will log data be retained in CloudWatch?
      CreateDynamoDbDatabase:
        default: Create DynamoDB database? If not, subsequent DynamoDB config will not apply.
      DynamoDbBillingMode:
        default: Use DynamoDB with provision or on-demand read and write capacity?
      DynamoDbReadCapacity:
        default: "For 'provisioned' billing mode: How many read capacity units to reserve?"
      DynamoDbWriteCapacity:
        default: "For 'provisioned' billing mode: How many write capacity units to reserve?"
      CreateLambdaAliases:
        default: Create 'dev', 'prod-blue' and 'prod-green' aliases for the Lambda function?
      LambdaTimeout:
        default: How many seconds for Lambda to process before timeout?
      LambdaMemorySize:
        default: How much memory (in MB) to provision per concurrent Lambda unit?
      LambdaRuntime:
        default: Which NodeJS runtime to use for Lambda?
      LambdaHandler:
        default: Which default handler to use for Lambda?
      LambdaCodeBucket:
        default: In which S3 bucket is the zip file with the Lambda code?
      LambdaCodeKey:
        default: What is the filename of the zipped Lambda code?
      LambdaCodeVersion:
        default: What is the version key of the zipped Lambda code?
      AskPackageBucket:
        default: In which S3 bucket is the zip file with the skill package (manifest and interaction model)?
      AskPackageKey:
        default: What is the filename of the zipped skill package?
      AskPackageVersion:
        default: What is the version key of the zipped skill package?
      AskClientId:
        default: What is the LWA client ID for the Alexa Developer Console account?
      AskClientSecret:
        default: What is the LWA client secret for the Alexa Developer Console account?
      AskClientRefreshToken:
        default: What is the LWA refresh token for the Alexa Developer Console account?
      AskVendorId:
        default: What is the vendor ID of the Alexa Developer Console account?
```