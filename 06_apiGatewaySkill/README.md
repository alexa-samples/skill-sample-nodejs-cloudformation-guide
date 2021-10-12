
# 'Flash Briefing' Skill using API Gateway

Within the 'AWS CloudFormation + ASK CLI Cookbook' repository, this 'flash briefing' skill project describes how to set up an HTTP endpoint for your Lambda function using [AWS API Gateway](https://aws.amazon.com/api-gateway/). This HTTP endpoint can be used as the feed URL for a flash briefing (FB) skill.

There are no completely new Cfn concepts introduced in this project, but you can learn how to use `cfn-deployer` for a skill type that is not 'custom'.

A word of warning: ASK CLI and cfn-deployer only takes you 95% of the way to deploying a FB skill end-to-end, but will ultimately throw an error message due to setting the endpoint URI in the wrong place in the skill manifest (`skill.json`). To fix this, please see section "Plugging the endpoint into the skill manifest".

## Using Lambda to generate a FB feed

The requirements for a FB feed [are documented here](https://developer.amazon.com/en-US/docs/alexa/flashbriefing/flash-briefing-skill-api-feed-reference.html). For this project, we provide dummy text content in JSON format:

```
{
    uid: "urn:uuid:01234567-0123-4567-89ab-0123456789ab",
    updateDate: "2021-10-11T00:00:00.0Z",
    titleText: "Cloud Formation Cookbook Update Number 1",
    mainText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    streamUrl: "",
    redirectionUrl: "https://www.example.com/redirectionPage",
}
```
Obviously, for a **real** FB skill there should be moving parts in order to provide up-to-date content.

## Resources

The infrastructure used in this project is (to the author's knowledge) simplest working setup of an API Gateway that simply serves as a fully open Lambda proxy:

```
Resources:
  [...]
  ApiGatewayRestApi:
    Type: 'AWS::ApiGateway::RestApi'
    Properties:
      Body:
        info:
          version: '1.0'
          title:
            Ref: 'AWS::StackName'
        paths:
          /FlashBriefing:
            get:
              x-amazon-apigateway-integration:
                httpMethod: POST
                type: aws_proxy
                uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaFunction.Arn}/invocations
              responses: {}
        swagger: '2.0'
  ApiGatewayDeployment:
    Type: 'AWS::ApiGateway::Deployment'
    Properties:
      RestApiId:
        Ref: ApiGatewayRestApi
      StageName: default
  LambdaApiEventPermission:
    Type: 'AWS::Lambda::Permission'
    Properties:
      Action: 'lambda:invokeFunction'
      Principal: apigateway.amazonaws.com
      FunctionName:
        Ref: LambdaFunction 
      SourceArn: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/*/GET/FlashBriefing
```

It provides an `AWS::ApiGateway::RestApi` API with a `/FlashBriefing` resource, a 'default' `ApiGatewayDeployment` stage, and an event permission to allow API Gateway to invoke the Lambda function.

In this case, the endpoint is not the Lambda ARN, but the invoke URL of the 'default' stagge's `/FlashBriefing` resource:

```
Outputs:
  SkillEndpoint:
    Value: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/default/FlashBriefing
```

## Plugging the endpoint into the skill manifest

Unfortunately, ASK CLI's cfn-deployer doesn't work end-to-end in the FB case: Once the infrastructure has been deployed, cfn-deployer takes the `SkillEndpoint` output and sets it as the value of `manifest.apis.flashBriefing.endpoint.uri` - Whereas it is expected as the value of `manifest.apis.flashBrieding.locales.["<locale>"].feeds[0].url`. This leads to an error message like this, at the point where cfn-deployer updates the skill manifest after infrastructure deployment:
```
[Error]: {
  "skill": {
    "eTag": "<eTag>",
    "resources": [
      {
        "action": "UPDATE",
        "errors": [
          {
            "message": "Object instance at property path \"$.manifest.apis.flashBriefing\" has unexpected property: \"endpoint\"."
          }
        ],
        "name": "Manifest",
        "status": "FAILED"
      }
    ],
    "skillId": "<Skill ID>"
  },
  "status": "FAILED"
}
```
To solve this, simply open `skill.json`, copy the endpoint URL from `manifest.apis.flashBriefing.endpoint.uri`, paste it into `manifest.apis.flashBrieding.locales.["<locale>"].feeds[0].url` and delete the entire `manifest.apis.flashBriefing.endpoint` property. After you've done this, you can deploy again, and your skill manifest will get updated as expected.
