# @allma/core-sdk

[![npm version](https://img.shields.io/npm/v/%40allma%2Fcore-sdk)](https://www.npmjs.com/package/@allma/core-sdk)
[![License](https://img.shields.io/npm/l/%40allma%2Fcore-sdk)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package provides a collection of shared utilities for building on the Allma platform. It is primarily designed to be used within AWS Lambda functions, such as custom step handlers (`CUSTOM_LAMBDA_INVOKE`) or Admin API handlers.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Key Features

-   **Structured JSON Logger:** A simple, level-based logger that outputs structured JSON for easy searching and analysis in Amazon CloudWatch Logs.
-   **S3 Payload Offloading:** Utilities (`offloadIfLarge`, `hydrateInputFromS3Pointers`) to automatically handle large data payloads by storing them in S3, avoiding AWS service limits.
-   **API Response Builders:** Helpers for creating standardized, consistent API Gateway responses.
-   **Auth Middleware:** A higher-order function (`withAdminAuth`) to easily secure Admin API Lambda handlers with Cognito JWT authentication.
-   **JSON Repair Utility:** A robust function (`extractAndParseJson`) to parse JSON from noisy LLM outputs.

## Installation

```bash
npm install @allma/core-sdk
```

## Core Usage

**Example: Using the structured logger in a custom Lambda handler.**

```typescript
import { log_info, log_error } from '@allma/core-sdk';
import { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context) => {
  const correlationId = context.awsRequestId; // Use a request ID for tracing

  log_info('Handler invoked', { input: event }, correlationId);

  try {
    // ... Your business logic here ...
    const result = { status: 'success' };
    log_info('Processing completed successfully', { result }, correlationId);
    return result;
  } catch (error: any) {
    log_error('An unexpected error occurred during processing', { 
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack 
    }, correlationId);

    // Re-throw the error or handle it as needed
    throw new Error('Processing failed');
  }
};
```

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.