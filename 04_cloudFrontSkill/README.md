
# 'Content delivery' (S3 + CloudFront) Skill

Within the 'AWS CloudFormation + ASK CLI Cookbook' repository, this 'content delivery' skill project exemplifies how to set up an S3 bucket suitable for storing media content, e.g. dynamically generated audio files from AWS Polly, and a CloudFront Content Distribution Network (CDN) to deliver such files to customers with minimal latency.

In real-life use cases, these two scenarios are most likely:
1. You dynamically generate AWS Polly files, e.g. because you're generating some highly dynamic or personalized content. In this case you wouldn't need a CDN, because you'd typically only use each file once.
2. You create the S3 bucket and a CDN using a Cfn template, but then manually upload bigger media files for audio, video or graphics.

This README also introduces the following concepts:
- **Advanced string operations, part 1**: Lowercasing the `ProjectAlias` parameter value, such that it can be used for an S3 bucket prefix, using **Cfn macros**
- **Advanced string operations, part 2**: Extracting a substring of the  Cfn stack ID, such that it can be used for an S3 bucket suffix, using the `!Split`, `!Select` and `!Join` functions
- Using **Cfn conditions** (introduced in the previous skill project) to conditionally create resources (in this case an optional `AWS::CloudFront::Distribution`)


## Background: S3 bucket name challenges

Within this project, we'll create an S3 bucket resource. S3 bucket names have [strict naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html), among them:
  - Bucket names must be between 3 and 63 characters long.
  - Bucket names can consist only of lowercase letters, numbers, dots (.), and hyphens (-).
  - Bucket names must begin and end with a letter or number.

The first goal is to provide a human-readable bucket name that complies to the naming rules. We can approach this in two ways:
1. Use the `ProjectAlias` parameter value that used as a prefix for most resource names, and transform it such that it works as an S3 bucket name, or
2. Offer a different parameter just for the S3 bucket name.

While option 2 is straightforward, option 1 requires a new Cfn feature: [Macros](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros.html), to extend Cfn's built-in functions. [The 'string' macro](https://github.com/awslabs/aws-cloudformation-templates/tree/master/aws/services/CloudFormation/MacrosExamples/StringFunctions) we'll use in this project will enable string operations such as lowercasing.

An addition requirement is that S3 bucket names need to be [globally unique](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket.html). If we use a fully static value for the `BucketName` property, only a single person will be able to successfully use the default version of this template - Everyone else will get a 'bucket name is already taken' error.

To solve this, we use a **random-ish bucket suffix**. We could also do this using a Cfn macro, but an easier way is to a the random section of the Cfn stack ID, which we can access using the `AWS::StackId` pseudoparameter. The Cfn stack ID has this structure:
- Example value: `:aws:cloudformation:eu-west-1:262684245649:stack/ask-CloudFormationCookbook-S3CloudFrontSkill-default-skillStack-1633698399313/a0b21df0-2838-11ec-8ad7-0a151ad97b55`
- Coarse structure: `<Stack ARN>/<Stack name>/<UUID>`
- Finer structure: `<Stack ARN>/<Stack name>/<[0-9a-f]{8}>-<[0-9a-f]{4}>-<[0-9a-f]{4}>-<[0-9a-f]{4}>-<[0-9a-f]{12}>`

We can extract the first group of the UUD (`<[0-9a-f]{8}>`) using Cfn's `!Split` and `!Select` functions, and then use it as a 'random' suffix for the S3 bucket name:
```
S3 bucket name: "<'normalized' bucket prefix>-<'random' bucket suffix>"
```

## S3 bucket name

```
Parameters:
  [...]
  ProjectAlias:
    Type: String
    Default: cfnCookbook-cloudFrontSkill
    Description: >
      An alias to make physical names of stack resources more easily to attribute
    AllowedPattern: '([a-zA-Z0-9][a-zA-Z0-9-]{3,64})'
    ConstraintDescription: >
      Must be between 4 and 64 characters,
      begin with an alphanumeric character
      and contain only alphanumeric characters and hyphens
  BucketPrefix:
    Type: String
    Default: ''
    Description: >
      The prefix of the bucket that will contain content
    AllowedPattern: '(()|([a-z0-9][a-z0-9-]{2,64}[a-z0-9]))'
    ConstraintDescription: >
      Must be either empty (default), or between 4 and 64 characters,
      begin and end with an alphanumeric character, and contain
      only lowercase alphanumeric characters and hyphens
  [...]
Conditions:
  isBucketPrefixProvided: !Not [!Equals [ !Ref BucketPrefix, '' ]]
```
- The template provides two possibilities:
  - Take the `ProjectAlias` parameter and transform it into S3 bucket name compliance, or
  - Provide a separate `BucketPrefix` parameter that already complies to S3 bucket name rules
- The `isBucketPrefixProvided` condition evaluates whether the `BucketPrefix` was omitted (i.e. the default empty string was used, in which case the condition evaluates as `false`) or if a custom bucket prefix was provided 

```
Resources:
  [...]
  Bucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: 'Delete'
    Properties:
      BucketName: !Join
        - "-"
        - - !If
            - isBucketPrefixProvided
            - !Ref BucketPrefix
            - 'Fn::Transform':
              - Name: 'String'
                Parameters:
                  InputString: !Ref ProjectAlias
                  Operation: Lower
          - !Select
            - 0
            - !Split
              - "-"
              - !Select
                - 2
                - !Split
                  - "/"
                  - !Ref "AWS::StackId"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false
```
As we see, the value of the `BucketName` property is quite a beast! But given what we learned above, we can make sense of it:
- The Cfn `!Join` function takes two arguments, first the delimiter `-` and then an array of elements to join
- The first element of the to-be-joined array is a condition statement, with two options depending on `isBucketPrefixProvided`:
  - If a bucket prefix is provided, then the `BucketPrefix` parameter will be used
  - Otherwise the operation `Lower` of the  `Fn::Transform` makro `'String'` will be applied to the `ProjectAlias` parameter.
    [The `'String'` makro](https://github.com/awslabs/aws-cloudformation-templates/tree/master/aws/services/CloudFormation/MacrosExamples/StringFunctions) needs to be deployed in the respective AWS account and region before use. For ease of presentation, it is already depoyed in the `ai-eu-sa-dev` account's `eu-west-1` region.
- The second element is for the random-ish bit of the stack ID's UUID. The nested `!Select`/`!Split` expression can be understood as follows:
  - "Split the stack ID by the `/` character  first, then take the third element (Cfn is 0-indexed), split it by the `-` character, and then take the first element"

  ## CloudFront Distribution

```
Parameters:
  [...]
  CreateCloudFrontDistribution:
    Type: String
    Default: false
    AllowedValues:
      - true
      - false
    Description: |
      Whether you need an AWS CloudFront CDN to distribute content
    [...]
Conditions:
  isCloudFrontDistributionRequested: !Equals [!Ref CreateCloudFrontDistribution, 'true']
  [...]
Resources:
    [...]
  CloudFrontDistribution:
    Type: 'AWS::CloudFront::Distribution'
    Condition: isCloudFrontDistributionRequested
    Properties:
      [...]
```

- So far we've only seen conditions used as boolean arguments to Cfn's `!If` function, but here in the `CloudFrontDistribution` we see a simpler way to use them: In a Cfn template, resources have an optional top-level attribute `Condition`, which accepts a condition like `isCloudFrontDistributionRequested` as its value and only creates the resource if the condition evaluates as true.