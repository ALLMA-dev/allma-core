# Allma CDK Integration Utilities

This package contains shared CDK constructs and utilities intended for consumers of the Allma platform. It provides the necessary building blocks to integrate your own AWS resources, such as custom Lambda functions, with your Allma flows.

## Purpose

The primary purpose of this package is to facilitate the `CUSTOM_LAMBDA_INVOKE` step type within Allma. It exports the necessary interfaces and utility functions to grant the Allma orchestrator the required IAM permissions to invoke your custom Lambdas.

## Usage

To allow Allma to invoke a custom Lambda function, you need to use the `grantInvoke` utility from this package within your CDK stack.

```typescript
import { grantInvoke } from '@allma/cdk-integration-utils';
import { MyCustomStack } from './my-custom-stack';

// In your CDK app file
const app = new cdk.App();
const myStack = new MyCustomStack(app, 'MyCustomStack');

// Grant the Allma orchestrator permission to invoke your function
grantInvoke(myStack, 'MyCustomFunction', {
  allmaStackName: 'MyAllmaStack',
  function: myStack.myFunction,
});
