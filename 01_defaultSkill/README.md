
# 'Default' Skill

Within the 'AWS CloudFormation + ASK CLI Cookbook' repository, this 'default' skill project explains the 'out of the box' Cfn template + infrastructure that comes along when you initiate a new skill project with `ask new` (at least, if you choose 'NodeJS', 'AWS with CloudFormation' and either 'High low game' or 'Fact skill').

This document highlights some weaknesses (marked with :warning:) of the default project, which are mostly compromises to make it more beginner-friendly. The 'basic' skill project will use practically the same resources, but with a bit of finesse, which will mitigate the weaknesses pointed out here.

## General configuration

The `ask-resources.json` contains the required `profiles.<default>.skillInfrastructure.userConfig` properties `runtime`, `handler`, `templatePath` and `awsRegion`, but no `artifactsS3` property.
:warning: Using this default configuration will cause the cfn-deployer to **create a new s3 bucket for each deployment**! If you actively develop a skill, this will quickly flood your AWS S3 console with outdated buckets. You can avoid this by configuring cfn-deployer to use an existing S3 bucket to host all your to-be-deployed lambda code, via the `artifactsS3` property (as seen in the 'basicSkill' project).

## Parameters

```
Parameters:
  SkillId:
    Type: String
  LambdaRuntime:
    Type: String
  LambdaHandler:
    Type: String
  CodeBucket:
    Type: String
  CodeKey:
    Type: String
  CodeVersion:
    Type: String
```

This project only uses the required parameters as described in `../README.md`. This means all the resources' configurations are hard-coded in the template.
- `SkillId`: Populated by cfn-deployer from `.ask/ask-states.json`
- `LambdaRuntime`: Populated by cfn-deployer from `.ask-resources.json`
- `LambdaHandler`: Populated by cfn-deployer from `.ask-resources.json`
- `CodeBucket`: Populated by cfn-deployer from `.ask/ask-states.json`
- `CodeKey`: Populated by cfn-deployer from `.ask/ask-states.json`
- `CodeVersion`: Populated by cfn-deployer from `.ask/ask-states.json`

## Resources

```
Resources:
  AlexaSkillIAMRole:
      Type: AWS::IAM::Role
      Properties:
        AssumeRolePolicyDocument:
          Version: 2012-10-17
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action:
                - sts:AssumeRole
        Path: /
        Policies:
          - PolicyName: alexaSkillExecutionPolicy
            PolicyDocument:
              Version: 2012-10-17
              Statement:
                - Effect: Allow
                  Action:
                    - logs:*
                  Resource: arn:aws:logs:*:*:*
[...]
```

- `AlexaSkillIAMRole`: The IAM role that the Lambda function assumes, in order to write logs to CloudWatch
    - The `AssumeRolePolicyDocument` property identifies Lambda as the entitiy/principal that will assume the role
    - The `Policies` proporty contains a new policy `alexaSkillExecutionPolicy`, which grants **all log-related permissions** (`logs:*`) to **all log (i.e. CloudWatch) resources** (`arn:aws:logs:*:*:*`) in the AWS account
        - :warning: This is definitely not a best practice in terms of [least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege). The 'basic' repository will line out a more secure alternative.

```
Resources:
[...]
  AlexaSkillFunction:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        S3Bucket: !Ref CodeBucket
        S3Key: !Ref CodeKey
        S3ObjectVersion: !Ref CodeVersion
      Handler: !Ref LambdaHandler
      Runtime: !Ref LambdaRuntime
      Role: !GetAtt AlexaSkillIAMRole.Arn
      MemorySize: 512
      Timeout: 60
```

- `AlexaSkillFunction`: The AWS Lambda function that executes the code in `./lambda` and provides the endpoint for the skill.
    - The `Code` property contains the location of the zip file with the lambda code
    - The `Handler` and `Runtime` properties specify how the Lambda executes its code
        - These three properties make use of the [Cfn reference function (!Ref)](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html), which in the case of parameters simply returns the parameter values.
    - The `Role` attributes assigns the role defined as `AlexaSkillIAMRole` to this logical resource.
        - This is accomplished by using the [Cfn 'get attribute' (`!GetAtt`) function](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html), which returns a specific attribute of a resource - In this case the ARN of the physical resource, after it was created.
    - The `MemorySize` and `Timeout` properties are hard-coded configurations of the Lambda
        - :warning: A timeout of 60 seconds rarely makes sense, and is a risk toward incurring avoidable costs

```
Resources:
[...]
  AlexaSkillFunctionEventPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:invokeFunction
      FunctionName: !GetAtt AlexaSkillFunction.Arn
      Principal: alexa-appkit.amazon.com
      EventSourceToken: !Ref SkillId
```
- `AlexaSkillFunctionEventPermission`: The event permission is an optional resource that specifies which entity/principal may invoke the Lambda function.
    - The `FunctionName` (using the `!GetAtt` function for the Lambda's ARN) and `Action` properties specify that the subject of this permission is to invoke the `AlexaSkillFunction` Lambda.
    - The `Principal` and `EventSourceToken` (refering the `SkillId` parameter) specify that only the skill may invoke the Lambda.

```
Resources:
[...]
  AlexaSkillFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /aws/lambda/${AlexaSkillFunction}
      RetentionInDays: 14
```
- `AlexaSkillFunctionLogGroup`: The CloudWatch log group retains the logs emitted by the `AlexaSkillFunction` Lambda.
    - The `LogGroupName` property composes the name of the log group using the [Cfn substitution function](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html).
        - Depending on the argument, `${Argument}` returns the same value as either `!Ref` or `!GetAtt` (if used with a property)
    - The `RetentionInDays` parameters specifies how long the logs are retained.
        - :warning: This hard-coded value might be either too long or too short, deepending on the project.

## Output

```
Outputs:
  SkillEndpoint:
    Description: LambdaARN for the regional endpoint
    Value: !GetAtt AlexaSkillFunction.Arn
```
- `SkillEndpoint` is the ARN of the `AlexaSkillFunction` Lambda, which serves as the endpoint of the skilll
    - cfn-deployer uses this output parameter to populate the skill manifest in `/skill-package/skill.json`
    - :warning: Using the [unqualified Lambda ARN](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) is acceptable for prototyping purposes, but will create complexities once you have a live/cert and dev stage of the skill. The 'basic' skill template will solve this by adding dev and blue/green live aliases.