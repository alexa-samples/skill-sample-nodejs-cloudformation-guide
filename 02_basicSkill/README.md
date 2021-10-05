
# 'Basic' Skill

Within the 'AWS CloudFormation + ASK CLI Cookbook' repository, this 'basic' skill project proposes a skill project template that leverages the advantages of cfn-deployer more than the 'default' template.

This README also introduces the following concepts:
- Defining a **single S3 bucket for Lambda code deployments** via the `artifactsS3` config
- Emulating **boolean parameters** in a Cfn template (see `DebugMode` in the 'Parameters' section)
- Limiting **log retention** of the `LambdaLogGroup` ressource using the `LogRetention` parameter
- Assigning **descriptive resource names** easily using the `!Sub` function (see the `ProjectAlias` parameter and the `AlexaSkillIAMRole` resource)
- Setting **Lambda environment variables** (see the `Lambdafunction` resource)
- Preparing **blue-green deployment** using Lambda aliases (see the section on `AWS::Lambda::Alias` resources)

## Advanced configuration options

In the 'default' skill project's README I pointed out the unfortunate and wasteful default cfn-deployer setting, by which a new S3 bucket is created for each deployment.
You can avoid this by leveraging the `profiles.<default>.skillInfrastructure.userConfig.artifactsS3` property of `ask-resources.json`:
- **`[...].artifactsS3.bucketName`** is for the name of an existing bucket to save the built and zipped lambda code in. The bucket must be **in the same region** as the stack, and the user must have access to the bucket (i.e. it should be in the same AWS account).
- **`[...].artifactsS3.bucketKey`** is the filename of the zipped lambda code.

To make best use of this parameter, I recommend to set up a single S3 bucket in the desired region to contain the lambda code for either an individual project, or for any number of projects (with distinct bucket keys) hosted in this region.


## Parameters

```
Parameters:
  ProjectAlias:
    Type: String
    Default: cfnCookbook-basicSkill
    Description: >
      An alias to make physical names of stack resources more easily to attribute
    AllowedPattern: '([a-zA-Z0-9-_]{4-64})'
    ConstraintDescription: >
      Must be between 4 and 64 letters,
      and contain only alphanumeric characters, hyphens and underscores
```
The `ProjectAlias` parameter is used to give ressources created in this stack more easily attributable and human-readable names, e.g. the Lambda function will not be listed as `ask-AWSCloudFormationDefault-de-AlexaSkillFunction-3v4MPaQMvp27` as in the 'default' skill project, but as `cfnCookbook-basicSkill-lambda`.
You can use the `AllowedPattern` constraint to with a regular expression to avoid characters that would be invalid for a resource name.

```
Parameters:
  [...]
  DebugMode:
    Type: String
    Default: true
    AllowedValues:
      - true
      - false
    Description: |
      Whether the Skill should run in debug mode. Value can bei either 'true' or 'false'
```
The `DebugMode` parameter is used within the business logic of the Lambda function (in order to emit verbose error messages during development). Cfn has no 'native' support for **boolean variables**, so instead we can use a string that is constrained to the 2 values ture and false.

```
Parameters:
  [...]
  LogRetention:
    Type: Number
    Default: 1
    Description: |
      The retention period (in days) for the Lambda's Cloudwatch log group
    AllowedValues: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653]
```
The `LogRetention` parameter is used to configure the AWS CloudWatch log group created in this stack. The set of allowed values corresponds to the available days of log retention.
Constraining the log retention prevents buildup of outdated log data, which might in time incurr AWS costs.

```
Parameters:
  [...]
  LambdaTimeout:
    Type: Number
    Default: 3
    Description: The timeout for the Lambda function in seconds
    MinValue: 3
    MaxValue: 10
  LambdaMemorySize:
    Type: Number
    Default: 128
    Description: The memory size for the Lambda function in MB
    AllowedValues:
      - 128
      - 256
      - 512
      - 1024
  LambdaRuntime:
    Type: String
    Description: |
      The runtime environment for the Lambda function
    AllowedValues:
      - "nodejs12.x"
      - "nodejs14.x"
  LambdaHandler:
    Type: String
    Description: |
      The function within your deployment package that will handle incoming requests
```
These parameters are used to configure the Lambda function. `LambdaRuntime` and `LambdaHandler` are populated via cfn-deployer and this have no defaults.

The remaining paramters `SkillId`, `CodeBucket`, `CodeKey` and `CodeVersion` are the same as in the 'default' template.

## Resources

```
Resources:
  AlexaSkillIAMRole:
      Type: AWS::IAM::Role
      Properties:
        [...]
        Policies:
          - PolicyName: !Sub ${ProjectAlias}-policy
            PolicyDocument:
              Version: 2012-10-17
              Statement:
                - Effect: Allow
                  Action:
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource: !GetAtt LambdaLogGroup.Arn
[...]
```

- `AlexaSkillIAMRole` The definition of Lambda's IAM role resource is similar to the one in the 'default' skill, but conforms better to the principle of 'least privilege' by granting only `logs:CreateLogStream` and `logs:PutLogEvents` actions in the `LambdaLogGroup` log group.
  - I think of it as a good practice to assign descriptive names to the resources created within a Cfn stack. For most resources, Cfn provides a `<ResourceType>Name` parameter like `PolicyName` here.
  With Cfn's [`!Sub` function](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html) you can substitute e.g. the `ProjectAlias` parameter into a template string like `${ProjectAlias}-policy`
    - :information_source: The reason we don't name the IAM role itself (even though a `RoleName` property is available in Cfn) is that we'd need an additional `CAPABILITY_NAMED_IAM` capability.

```
Resources:
   [...] 
  LambdaLogGroup:
    Type: AWS::Logs::LogGroup
    DeletionPolicy: Delete
    Properties: 
      LogGroupName: !Sub /aws/lambda/${ProjectAlias}-lambda'
      RetentionInDays: !Ref LogRetention
```

- `LambdaLogGroup`: The CloudWatch log group is configured similarly to the one in the 'default' skill, with two differences:
    -  The `RetentionInDays` property, uses the `LogRetention` parameter defined above.
    - The [`DeletionPolicy`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html) specifies what will happend to the resource in case the stack is deleted via Cfn. Options are:
        - `Delete`: In this case, the resource gets deleted and no data are retained. This is the default option in Cfn, and also the option chosen here, assuming that old log data are no longer relevant.
        - `Retain`: In this case, the resource doesn't get deleted along with the stack.

```
Resources:
   [...]
  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub ${ProjectAlias}-lambda
      Code:
        S3Bucket: !Ref CodeBucket
        S3Key: !Ref CodeKey
        S3ObjectVersion: !Ref CodeVersion
      Handler: !Ref LambdaHandler
      Runtime: !Ref LambdaRuntime
      Role: !GetAtt LambdaRole.Arn
      MemorySize: !Ref LambdaMemorySize
      Timeout: !Ref LambdaTimeout
      Environment: 
        Variables: 
          DEBUG_MODE: !Ref DebugMode
          PROJECT_NAME: !Ref ProjectAlias
```
- `LambdaFunction`: The resource is configured similar to the one in the 'default' project, with two main differences:
  - `MemorySize` and `Timeout` are parameterized and no longer 'hard-coded'
  - The `Environment` property allows setting Lambda environment variable via `Variables`. Within the Lambda code, these parameters can be accesssed as `process.env.<PARAMETER_NAME>`

```
Resources:
   [...]
  LambdaAliasDev:
    Type: AWS::Lambda::Alias
    Properties:
      FunctionName: !Ref LambdaFunction
      FunctionVersion: $LATEST
      Name: dev
  LambdaAliasProdBlue:
    Type: AWS::Lambda::Alias
    Properties:
      FunctionName: !Ref LambdaFunction
      FunctionVersion: $LATEST
      Name: prod-blue
  LambdaAliasProdGreen:
    Type: AWS::Lambda::Alias
    Properties:
      FunctionName: !Ref LambdaFunction
      FunctionVersion: $LATEST
      Name: prod-green
```
- These three `AWS::Lambda::Alias` resources provide [Lambda aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html) for different skill stages:
  - The `dev` alias is for the development stage of the skill, so you don't develop against the skill's live endppoint once there is a live stage
  - The `prod-blue` and `prod-green` aliases are both for the certification and live stage of the skill, in the sense of [blue-green deployment](https://docs.cloudfoundry.org/devguide/deploy-apps/blue-green.html): With each submission for certification, the blue and green alias' endpoint is used in turn. After certification, the chosen alias serves live traffic, while the other is idle and should be used for the next submission to certification.
    - Initially, all three aliases point to the `$LATEST` Lambda version. Once you submit for certification, you should [publish the Lambda version](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) and point the respective `prod` alias to this version.

```
Resources:
  [...]
  LambdaAliasDevEventPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:invokeFunction
      FunctionName: !Ref LambdaAliasDev
      Principal: alexa-appkit.amazon.com
      EventSourceToken: !Ref SkillId
  LambdaAliasProdBlueEventPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:invokeFunction
      FunctionName: !Ref LambdaAliasProdBlue
      Principal: alexa-appkit.amazon.com
      EventSourceToken: !Ref SkillId
  LambdaAliasProdGreenEventPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:invokeFunction
      FunctionName: !Ref LambdaAliasProdGreen
      Principal: alexa-appkit.amazon.com
      EventSourceToken: !Ref SkillId
```
- Each Lambda alias needs to have its own event permission, even though their configuration is identical except for the `FunctionName` parameter.

## Output

```
Outputs:
  SkillEndpoint:
    Description: ARN of the Lambda 'dev' alias
    Value: !Ref LambdaAliasDev
```
- In contrast to the 'default' skill, this project uses the ARN of the Lambda's `dev` alias as the skill endpoint. Once you prepare your skill for certification, you need to replace the endpoint with the `prod-blue` or `prod-green` alias' ARN