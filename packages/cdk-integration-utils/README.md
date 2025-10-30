# @allma/cdk-integration-utils

[![npm version](https://img.shields.io/npm/v/%40allma%2Fcdk-integration-utils)](https://www.npmjs.com/package/@allma/cdk-integration-utils)
[![License](https://img.shields.io/npm/l/%40allma%2Fcdk-integration-utils)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package provides helper utilities for developers who are building their own AWS CDK constructs to integrate with an existing Allma deployment. Its primary purpose is to simplify the process of registering custom modules with the Allma platform.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Installation

```bash
npm install @allma/cdk-integration-utils
```

## Core Usage

The most common use case is registering a custom Lambda function as an invokable step (`CUSTOM_LAMBDA_INVOKE`) within the Allma Flow Editor. The `createExternalStepRegistration` utility creates a CDK `AwsCustomResource` that automatically adds an entry to Allma's DynamoDB configuration table during `cdk deploy`.

**Example: Registering a custom "Premium Calculator" Lambda.**

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StepType } from '@allma/core-types';
import { createExternalStepRegistration } from '@allma/cdk-integration-utils';

export interface MyCustomModuleStackProps extends cdk.StackProps {
  // Pass in the name of the Allma config table from your Allma deployment
  allmaConfigTableName: string;
}

export class MyCustomModuleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyCustomModuleStackProps) {
    super(scope, id, props);

    // 1. Define your custom Lambda function
    const premiumCalculatorLambda = new lambda.Function(this, 'PremiumCalculator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda'),
      // ... other lambda props
    });

    // 2. Register it with Allma using the utility
    createExternalStepRegistration(this, 'AllmaPremiumCalculatorRegistration', {
      configTableName: props.allmaConfigTableName,
      moduleIdentifier: 'my-company/premium-calculator',
      displayName: 'Premium Calculator',
      description: 'Calculates an insurance premium based on user data.',
      stepType: StepType.CUSTOM_LAMBDA_INVOKE,
      lambdaArn: premiumCalculatorLambda.functionArn,
      defaultConfig: {
        // This is the default JSON config that appears in the Flow Editor
        // when a user drags this step onto the canvas.
        someDefaultParameter: 'defaultValue',
      },
    });
  }
}
```

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.