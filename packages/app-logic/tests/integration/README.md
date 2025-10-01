# Integration Testing Strategy

This document outlines the strategy and setup for running integration tests for the `allma-core/logic` package.

## Core Principles

1.  **Live AWS Environment**: Tests run against a real, deployed AWS environment (specifically the `dev` stage). This is crucial for verifying IAM roles, service integrations, and SDK usage.
2.  **Test Isolation**: Each test suite is responsible for creating and cleaning up its own test data (e.g., mock records in DynamoDB) to ensure tests are independent and rerunnable.
3.  **Mocking External Services**: To keep tests fast, deterministic, and cost-effective, we mock all external, third-party dependencies. This primarily includes LLM providers like Google Gemini. The mock is injected at the adapter layer.
4.  **Dynamic Configuration**: Tests do not hardcode resource names. A global setup script (`setup.mjs`) reads the CDK configuration for the `dev` stage and injects resource names into the test process's environment variables.
5.  **Dedicated Test Runner**: Integration tests are separated from unit tests and are run using a dedicated Jest configuration (`jest.config.integration.js`) and a specific `npm` script.

## How to Run

1.  **Prerequisites**:
    *   Ensure the `dev` stage of the `AllmaPlatformStack` has been successfully deployed via CDK.
    *   Ensure your local environment is configured with AWS credentials that have access to the `dev` stage account (e.g., via `aws-vault`, environment variables, or an instance profile).

2.  **Execution**:
    Run the following command from the `packages/allma-core/logic` directory:

    ```bash
    npm run test:integration
    ```

    This command uses the specific Jest configuration to find and run only the files located in `/tests/integration`.

## Writing a New Integration Test

1.  Create your test file under `packages/allma-app-logic/tests/integration/`.
2.  Follow the pattern of creating required test data in DynamoDB within a `beforeAll` block.
3.  Use `afterAll` to delete the test data you created.
4.  If you need to mock a module (like the LLM adapter), use `jest.mock()` at the top of your test file.
5.  Access resource names (like table names) from `process.env`, as they are injected by the global `setup.ts` script.