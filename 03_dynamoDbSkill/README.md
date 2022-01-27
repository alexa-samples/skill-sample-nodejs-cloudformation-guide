
# 'DynamoDB' Skill

Within the 'AWS CloudFormation + ASK CLI Guide' repository, this 'DynamoDB' skill project shows how to create a 'classic' skill stack with AWS DynamoDB for persistence.

For ease of demonstration, the skill itself will only count how many sessions the respective user had. In order to do so, its Lambda function reads from, and writes to the DynamoDB table created in the project.

Beside how to model a DnymoDB resource in Cfn, this README also introduces the following concept:
- Using **Cfn conditions** to set multiple resource properties based on the value of a single parameter

## Prerequisites

To deploy this project, you (i.e. your AWS CLI user) need to have permissions for DynamoDB, Lambda and CloudWatch. You can probably get by with fewer permissions, but a convenient selection of managed IAM policies are:
- AmazonDynamoDBFullAccess
- AWSLambda_FullAccess
- CloudWatchFullAccess
- IAMFullAccess

## Parameters

```
Parameters:
  [...]
  DynamoDbBillingMode:
    Type: String
    Default: PAY_PER_REQUEST
    Description: >
      Billing mode for your DynamoDB table. 'PROVISIONED' is eligible for the AWS free tier,
      and will reserve at least 1 capacity unit for reading and writing. 'PAY_PER_REQUEST'
      enables on-demand scaling and billing.
    AllowedValues:
      - PROVISIONED
      - PAY_PER_REQUEST
  DynamoDbReadCapacity:
    Type: Number
    Default: 1
    Description: |
      The read capacity of the DynamoDB table. Only applies for 'PROVISIONED' billing mode.
    MinValue: 1
  DynamoDbWriteCapacity:
    Type: Number
    Default: 1
    Description: |
      The write capacity of the DynamoDB table. Only applies for 'PROVISIONED' billing mode.
    MinValue: 1
```
These three parameters `DynamoDbBillingMode`, `DynamoDbReadCapacity` and `DynamoDbWriteCapacity` are used to configure the `DynamoDbTable` resource described below. Worth mentioning is that if the `PAY_PER_REQUEST` option is selected for billing mode, the read and write capacity parameters become obsolete (bc in this case DynamoDB autoscales out as needed). The following condition will address this potential contradiction.

## Defining and evaluating Cfn conditions

```
Conditions:
  isDynamoDbProvisioned: !Equals [ !Ref DynamoDbBillingMode, PROVISIONED ]
Resources:
  [...]
  DynamoDbTable:
    Type: AWS::DynamoDB::Table
    Properties: 
      TableName: !Sub ${ProjectAlias}-table
      AttributeDefinitions: 
        - AttributeName: userId
          AttributeType: S
      BillingMode: !Ref DynamoDbBillingMode
      KeySchema: 
        - AttributeName: userId
          KeyType: HASH
      ProvisionedThroughput: !If
        - isDynamoDbProvisioned
        - ReadCapacityUnits: !Ref DynamoDbReadCapacity
          WriteCapacityUnits: !Ref DynamoDbWriteCapacity
        - Ref: AWS::NoValue
```

A Cfn condition is evaluated at each Cfn deployment, right after parameter values have been ingested and before resources are provisioned. The condition's key can be used as a boolean parameter in the template's resources section, in conjunction with if-then-conditions.
In this case, the `isDynamoDbProvisioned` condition statement `!Equals [ !Ref DynamoDbBillingMode, PROVISIONED ]` asserts that the value of `DynamoDbBillingMode` is equal to `PROVISIONED`, and can be either true or false.
In the `DynamoDbTable` resource, the `ProvisionedThroughput` propert uses the `isDynamoDbProvisioned` condition in an if-else-statement (using the Cfn !If function) that reads as follows: 
> If `isDynamoDbProvisioned` is true, then configure `ProvisionedThroughput` to use the values of `DynamoDbReadCapacity` and `DynamoDbWriteCapacity` for `ReadCapacityUnits` and `WriteCapacityUnits` respectively, else leve the `ProvisionedThroughput` config empty.
