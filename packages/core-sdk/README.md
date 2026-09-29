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

## Redacting log output

Register one redactor and every `log_*` call passes through it. It runs on the `details` object (it must return a plain object) and on the `message` string (it must return a string). If it throws or returns the wrong type, the line is written with `message` and `details` set to `'[REDACTION_FAILED]'`. The raw values are never written.

```typescript
import { createKeyPatternRedactor, setLogRedactor } from '@allma/core-sdk';

setLogRedactor(createKeyPatternRedactor({
  keys: ['email', 'phone'],           // case-insensitive key names; their values are replaced
  patterns: ['[^@\\s]+@[^@\\s]+'],    // regexes (flags "gi") replaced inside every string and the message
  replacement: '[PII]',               // optional, defaults to '[REDACTED]'
}));

// Or pass your own function: setLogRedactor((value) => myRedact(value));
// setLogRedactor(undefined) removes it.
```

The redactor is process-wide and is shared by every copy of `@allma/core-sdk` in the bundle. If the `LOG_REDACTION_CONFIG` environment variable holds a JSON `{ keys, patterns, replacement? }` object, the logger registers `createKeyPatternRedactor` with it when it loads, unless a redactor is already registered. If that config is invalid, every line is masked and one warning is logged.

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.