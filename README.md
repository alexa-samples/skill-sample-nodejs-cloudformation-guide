
# AWS CloudFormation + ASK CLI Cookbook

## Introduction

This repository has two purposes:
1. Educate about the use of AWS CloudFormation (Cfn) as part of ASK CLI's cfn-deployer, and
2. Offer examples for a range of common Cfn use cases. Currently, there include:
    - The ASK CLI's [default 'Hello world' skill](./mainline/--/01_defaultSkill), to illustrate how cfn-deployer works on a basic level
    - An improved 'basic' skill (using only Lambda and Cloudwatch resources) that incorporates some useful cfn-deployer tips
    - A 'DynamoDB' skill to serve as an example for both a DynamoDB resource and Cfn conditional statements
    - An 'S3' skill to serve as an example for both an S3 resource and string manipulation
    - An 'API Gateway' skill
    - A 'Cloudwatch Alarm' skill to serve as an example for both an Cloudwatch Alarm and use of environment variables

This README provides a general introduction to Cfn, as far as relevant for Alexa skill development, and outlines the interaction between ASK CLI and Cfn.

## Prerequisites

Prerequisite for trying out these examples is [a configured ASK CLI profile](https://developer.amazon.com/en-US/docs/alexa/smapi/ask-cli-command-reference.html#configure-command) that is associated with [a configured AWS CLI profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html). The AWS CLI user needs to have a the IAM policies required for deploying the respective resources (e.g. `lambda:CreateFunction`).

### Trying out Cfn templates without ASK CLI

In some cases you might want to try out some of the templates in this Cookbook without setting up a skill project (or an ASK CLI profile) first. This is possible, e.g. if you just upload one of the templates files in the [AWS Cfn Console](https://console.aws.amazon.com/cloudformation/home). One issue you'll encounter is to provide values for the parameters `CodeBucket`, `CodeKey`, `CodeVersion` & `SkillId` (explained in the 'Interaction b/w Cfn and ASK CLI' section below). If you fill in nonsense values (at least for the `Code*` parameters), the deployment will fail!
Instead, you can use these 'dummy' values:
- **CodeBucket:** `cfn-source-eu-west-1`
- **CodeKey:** `cfnCookbookDummy.zip`
- **CodeVersion:** `eUUqLNIE_pPC16_fb1OpBVRJmZT4qibs`
- **SkillId:** `amzn1.ask.skill.20998b0d-c197-4289-8e31-44f2adb51240`

## Quickstart

To get started with any of the example skills: 
1. Navigate into the respective directory (e.g. `./basicSkill`).
2. Check out `README.md` to learn what's particular about this example, and whether it requires specific configuration.
3. One mandatory step **if you use a non-default ASK CLI profile** is to open `ask-resources.json` and replace the property key `profiles.default` with your profile name, e.g. `profiles.my-custom-profile`.
4. Deploy the skill project using `ask deploy [--profile my-custom-profile]`. The terminal will display the progress, and once ot's done you can test the skill in the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) and inspect the stack in the [AWS Cfn console](https://console.aws.amazon.com/cloudformation/home).

## CloudFormation basics

From the [AWS Cfn Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) (emphasis mine):
> AWS CloudFormation is a service that helps you **model and set up your AWS resources** so that you can spend less time managing those resources and more time focusing on your applications that run in AWS. You create a **template that describes all the AWS resources that you want** (like Amazon EC2 instances or Amazon RDS DB instances), and **CloudFormation takes care of provisioning and configuring those resources** for you. You don't need to individually create and configure AWS resources and figure out what's dependent on what; CloudFormation handles that.

Cfn is AWS' **'infrastructure as code'** solution,  i.e. it allows provisioning and managing  cloud resources by writing a template file that is both human readable, and machine consumable. This has at least three main benefits when compared to setting up infrastructure 'by hand':
1. Iterating on finding the right set of configuration is less messy.
2. Infrastructure with all (or most) of its components and their configurations become part of the project's codebase, and can be managed using version control etc.
3. It becomes easier to share models of infrastructure, both with partners and with the (developer) community.

A Cfn **template** is a YAML (or JSON, but YAML is generally preferred) file that lists all of the **logical resources** for a project, along with their configuration and optionally **parameters**.
Once a template is deployed with Cfn, it creates a **stack** that contains all the provisioned **physical resources**, and optional **output** values.

### Template structure

In the most generalized terms (in the context of Alexa skill development), Cfn templates have the following sections
- `AWSTemplateFormatVersion`: Mandatory, is always `2010-09-09`
- **Parameters:** [Parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html) provide degrees of freedom during the creation stage of a Cfn stack:
    - Parameters always have a name, which needs to be unique within a template and by which it can be referenced
    - Parameters can have a `Type` of `String` or `Number`
    - Parameters can have a `Default` value. If they don't, user input is required during cration
        - ASK CLI Cfn templates have some parameters without defaults (`SkillId`, `CodeBucket`, `CodeKey` and `CodeVersion`, see section "**placeholder**" below)
    - Parameters can have constraints, depending on their type:
        - `String` parameters can have an `MinLength`, `MaxLength`, `AllowedPattern` or `AllowedValues`
        - `Number` parameters can have a `MinValue`, `MaxValue` or `AllowedValues` 
- **Resources:** [Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resources-section-structure.html) are instances of AWS services, e.g. Lambda functions and permission, IAM policies and roles, Cloudwatch log groups etc.
    - **Logical resources** provide the definition and configuration of resources within a Cfn template. Logical resource names need to be unique within a template.
    - **Physical resources** are AWS resources that have been provisioned as part of an AWS Cfn stack. Logical resources typically have an ARN that is universally unique, and may incur costs.
    - Resources always have a `Type`, e.g. `AWS::Lambda::Function` for a Lambda function. A list of all AWs resource types [can be fund here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).
    - Resources always have `Properties`, but the individual propoerty keys are specific for each resource type. As an example, the properties of a Lambda function are [described here in detail](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
- **Outputs:** [Outputs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html) are variables that are declared in the Cfn template, and whose values are assigned per stack deployment.
    - In the context of the ASK CLI, only one output variable is used: `SkillEndpoint`, whose value populates the `manifest.apis.custom.endpoint.uri` attribute of the skill's manifest (`skill-package/skill.json`)
- **Description:** Each parameter, resource or output as well as the template itself can have a description. 
- **Other:** Cfn templates can also have [rules](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/rules-section-structure.html), [mappings](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html), [conditions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html) and [transformers (macros)](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/transform-section-structure.html), but they are mostly not in scope for this repo.

## Interaction b/w Cfn and ASK CLI

`@ask-cli/cfn-deployer` is the so-called [deploy delegate](https://github.com/alexa/ask-cli/tree/develop/lib/builtins/deploy-delegates) of ASK CLI, and is therefore neatly integrated.

If you choose to use `cfn-deployer` when creating a new skill, there will be a path `infrastrucutre/cfn-deployer/` in the skill project's root directory, containing only the Cfn template `skill-stack.yaml`.
The `cfn-deployer`can be configured using the `profiles.<default>.skillInfrastructure` property of the `ask-resources.json` file in the root directory. The 'basic' skill in this repo will go more into the details, but at this point we consider only these sub-propoerties:
- `userConfig.runtime`: Will be used to configure the Lambda function. Default value is `nodejs12.x`
- `userConfig.handler`: Will be used to configure the Lambda function. Default value is `index.handler`
- `userConfig.templatePath`: Default is `./infrastructure/cfn-deployer/skill-stack.yaml`
- `userConfig.awsRegion`: Uses the configured AWS region for your default AWS profile, e.g. `eu-west-1`

In your first `ask deploy` deployment, the following things will happen:
1. ASK CLI creates the skill itself, based on the skill manifest and language model in the `skill-package` folder.
2. ASK CLI creates a folder `.ask` in which it will save deployment data, such as the ID of the skill from step 1.
3. ASK CLI bundles the code from the `lambda` folder in the `.ask/lambda` folder.
4. ASK CLI creates an AWS S3 bucket, uploads the bundled `lambda` code there, and saves the bucket name, key and version in `.ask/ask-states.json`.
5. ASK CLI passes the parameters `CodeBucket`, `CodeKey`, `CodeVersion` & `SkillId` from `.ask/ask-states.json`, and `LambdaRuntime` & `LambdaHandler` from `.ask-resources.json` into the Cfn deploy process, using the template from `infrastrucutre/cfn-deployer/skill-stack.yaml`.
6. Once the infrastructure is deployed, ASK CLI takes the output parameter `SkillEndpoint` and saves it in `.ask/ask-states.json`.
7. ASK CLI updates the skill manifest in `skill-package/skill.json` with the skill endpoint
