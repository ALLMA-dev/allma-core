# @allma/core-cdk

[![npm version](https://img.shields.io/npm/v/%40allma%2Fcore-cdk)](https://www.npmjs.com/package/@allma/core-cdk)
[![License](https://img.shields.io/npm/l/%40allma%2Fcore-cdk)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package contains the core AWS CDK (Cloud Development Kit) constructs required to deploy the entire Allma platform to your AWS account. It is the primary entry point for setting up a new Allma instance.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Installation

```bash
npm install @allma/core-cdk
```

## Core Usage

To deploy an Allma instance, you will create a standard AWS CDK application and instantiate the `AllmaStack`. You must provide a stage-specific configuration, which at a minimum requires your AWS Account ID and the ARN of a secret in AWS Secrets Manager containing your AI provider API keys.

**Example `bin/my-allma-app.ts`:**

```typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AllmaStack, Stage } from '@allma/core-cdk';

const app = new cdk.App();

// Define your stage-specific configuration
const devConfig = {
  // Required: Your AWS Account ID and Region
  awsAccountId: '123456789012',
  awsRegion: 'us-east-1',
  
  // Required: The ARN of your API key secret in AWS Secrets Manager
  aiApiKeySecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:MyAiApiKeys-XXXXXX',

  // Optional: Override default settings
  stage: Stage.DEV,
  adminApi: {
    // For a custom domain for the Admin API
    // domainName: 'allma-api.example.com',
    // certificateArn: 'arn:aws:acm:...',
  }
};

new AllmaStack(app, 'MyAllmaDevInstance', {
  // Standard CDK Stack Props
  env: {
    account: devConfig.awsAccountId,
    region: devConfig.awsRegion,
  },
  // Pass the Allma-specific configuration
  stageConfig: devConfig,
  
  // Optional: Deploy the Admin UI to S3/CloudFront
  adminShell: {
    assetPath: '../path/to/your/admin-shell/dist',
    // domainName: 'allma.example.com',
    // certificateArn: 'arn:aws:acm:...',
  }
});
```

## Automatic Configuration Import

To help bootstrap a new Allma environment, you can automatically import an initial set of Flows and Step Definitions during deployment. This is useful for setting up baseline configurations, migrating configurations between environments, or managing your Allma setup as code.

This is controlled by the `initialAllmaConfigPath` property in your stack configuration.

```typescript
const devConfig = {
  // ... other required properties
  awsAccountId: '123456789012',
  awsRegion: 'us-east-1',
  aiApiKeySecretArn: 'arn:aws:secretsmanager:...',

  // Point to a directory containing your .json config files
  initialAllmaConfigPath: './allma-config', 
};
```

The path can point to either a single JSON file or a directory containing multiple `.json` files. If a directory is provided, all JSON files within it will be bundled and imported together.

### File Format

Each JSON file must be structured according to the `AllmaExportFormat`. It can contain either an array of `stepDefinitions`, an array of `flows`, or both.

**Example `allma-config/steps.json`:**
```json
{
  "stepDefinitions": [
    {
      "id": "CUSTOM_SEND_EMAIL",
      "name": "Send a Custom Email",
      "description": "Sends an email using a predefined template.",
      "handler": "SEND_EMAIL",
      "defaultConfig": {
        "subject": "Default Subject",
        "template": "default-template"
      }
    }
  ]
}
```

**Example `allma-config/flows.json`:**
```json
{
  "flows": [
    {
      "id": "ONBOARDING_FLOW",
      "name": "New User Onboarding",
      "description": "Orchestrates the welcome sequence for new users.",
      "startStep": "SendWelcomeEmail",
      "steps": [
        {
          "id": "SendWelcomeEmail",
          "stepDefinitionId": "CUSTOM_SEND_EMAIL",
          "config": {
            "subject": "Welcome to Allma!"
          },
          "transitions": [
            {
              "target": "END"
            }
          ]
        }
      ]
    }
  ]
}
```

### Validation

Configuration validation occurs automatically during `cdk deploy`. When the `AllmaStack` is deployed, a custom resource Lambda is triggered which is responsible for the import process.

This Lambda uses the exact same validation logic (Zod schemas) as the Allma Admin API. It checks the structural integrity of the configuration, ensures that all step definitions are valid, and verifies that flow transitions point to existing steps within the flow.

If any validation error occurs, the import will fail, which in turn **causes the entire `cdk deploy` operation to fail**. This provides immediate feedback directly in your terminal, preventing broken configurations from being deployed.

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.
