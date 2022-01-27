
# 'Aurora' Skill

Within the 'AWS CloudFormation + ASK CLI Guide' repository, this 'Aurora' skill project demonstrates how to set up [an AWS Aurora Serverless database](https://aws.amazon.com/rds/aurora/serverless/), and i[ts Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html).

An Aurora Serverless DB can be a preferrable way to persist data over the 'default' NoSQL DynamoDB, e.g. when:
- The skill operates on a number of entities (e.g. users, sessions, products, scores, ...) with well-defined and relevant relationships
- You plan to run complex queries on the persisted data (which is more convenient using SQL)
- You'll need to regularly count through many items with low latency, e.g. with leaderboards in games

This README also introduces the following concept:
- [**Custom resources**](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html): We'll use [a Lambda custom resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources-lambda.html) to create a table in our Aurora DB at provision-time. Charmingly, we can use our skill backend Lambda to 'moonshine' as this custom resource.


## Prerequisites

To deploy this project, you (i.e. your AWS CLI user) need to have permissions for RDS, the Data API, and Secrets (in addition to the basics like Lambda, CloudWatch and S3). You can probably get by with fewer permissions, but a convenient selection of managed IAM policies are:
- AmazonRDSFullAccess
- AmazonRDSDataFullAccess
- SecretsManagerReadWrite
- AWSLambda_FullAccess
- CloudWatchFullAccess
- IAMFullAccess

This project also uses String macros, as introduced in the 'CloudFront + S3' project. Thus, you need to have a Lambda in your chosen region to perform Cfn String operations.


## Data API and Secrets

The Data API provides a managed way to query RDS, without having to manually establish a database connection and bundling transactions. In order to auhtorize to the Data API (from you Lambda endpoint, but also in the AWS Console's RDS Query Manager) you need to provide your credentials via an [AWS Secret](https://aws.amazon.com/secrets-manager/).

Conveniently, Cfn can auto-generate a password in a template set of credentials, as seen here:

```
  AuroraSecret:
    Type: 'AWS::SecretsManager::Secret'
    Properties:
      Name: !Sub ${ProjectAlias}-secret
      GenerateSecretString:
        SecretStringTemplate: '{"username": "admin"}'
        GenerateStringKey: "password"
        PasswordLength: 30
        ExcludeCharacters: '"@/\'
```

This generates a secret with a set of credentials, as in this example:
```
{
  "username": "admin",
  "password": "<30 letter password without ambiguous characters like ["@/\]>"
}
```

The `SecretTargetAttachment` then binds these credentials to the newly created Aurora DB:
```
  SecretRDSInstanceAttachment:
    Type: "AWS::SecretsManager::SecretTargetAttachment"
    Properties:
      SecretId: !Ref AuroraSecret
      TargetId: !Ref AuroraCluster
      TargetType: AWS::RDS::DBCluster
```

For the Lambda to query the Data API, it needs to have the ARNs of the Aurora Cluster, the ARN of the Secret and the DB name, so we're providing them via environment variables:

```
  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      [...]
      Environment: 
        Variables: 
          [...]
          AURORA_SECRET_ARN: !Ref AuroraSecret
          AURORA_CLUSTER_ARN: !Join
            - ''
            - - !Sub "arn:${AWS::Partition}:rds:${AWS::Region}:${AWS::AccountId}:cluster:"
              - 'Fn::Transform':
                - Name: 'String'
                  Parameters:
                    InputString: !Ref ProjectAlias
                    Operation: Lower
              - '-cluster'
          AURORA_DATABASE_NAME: !Sub ${ProjectAlias}Db
```
The `AURORA_CLUSTER_ARN` variable looks a bit messy - Unfortunately Cfn doesn't provide the Cluster ARN via `!GettAtt AuroraCluster.Arn`, so we have to construct the ARN ourselves.


## Custom Lambda Resource

Without a Custom Resource, cfn-deployer would create an Aurora Cluster and DB, but no tables, so we'd have to set them up in a separate step. To avoid this, we set up the `LambdaAliasDev` alias of our `LambdaFunction` resource to double as a Custom Resource (via the `ServiceToken` property):
```
  AuroraTableCreator:
    Type: AWS::CloudFormation::CustomResource
    DependsOn: AuroraCluster
    Properties:
      ServiceToken: !Ref LambdaAliasDev
      Region: !Ref AWS::Region
```

Now Cfn will send events to the skill upon Creation, Update or Delete of the resource. These events have this structure:
```
{
        "RequestType": "Create",
        "ServiceToken": "arn:aws:lambda:<Region>:<AccountId>:function:<ProjectAlias>:<Alias>",
        "ResponseURL": "https://cloudformation-custom-resource-response-<Region>.s3-<Region>.amazonaws.com/<URL>",
        "StackId": "arn:aws:cloudformation:<Region>:<AccountId>:stack/<StackID>",
        "RequestId": "<UUID>",
        "LogicalResourceId": "AuroraTableCreator",
        "ResourceType": "AWS::CloudFormation::CustomResource",
        "ResourceProperties": {
            "ServiceToken": "arn:aws:lambda:<Region>:<AccountId>:function:<ProjectAlias>:<Alias>",
            "Region": "<Region>"
        }
```

In the Skill's Lambda code, we can now create a handler for these Cfn requests - In this case, to set up the respective table. For details, see the `CloudFormationHandler` in `index.js` and `createUserTable` in `database.js`. One thing of note is that you'll need to load the 'cfn-response-promise' npm package in order to facilitate sending the right Cfn response.

The `CloudFormationHandler` only takes action for `Create` events, whereas it only acknowledges `Update` and `Delete` events. The reasoning is that especially for `Delete` events, the entire Aurora cluster gets deleted, so there's no need to take further action.
In a production use case, you might want to backup data in response to `Delete` events.