# ALLMA Project Description for AI Agents

This document provides a comprehensive technical overview of the Allma platform, designed for consumption by AI agents to understand its architecture, capabilities, and repository structure.

---

### **Table of Contents**
1.  [Allma: The Serverless AI Orchestration Platform](#allma-the-serverless-ai-orchestration-platform)
2.  [Core Architecture & Principles](#core-architecture--principles)
3.  [Key Concepts: Flows & Steps](#key-concepts-flows--steps)
4.  [Core Capabilities & Step Types](#core-capabilities--step-types)
5.  [Management, Monitoring & Debugging: The Allma Admin Panel](#management-monitoring--debugging-the-allma-admin-panel)
6.  [Advanced Debugging Suite](#advanced-debugging-suite)
7.  [Analysis of Extensibility and Integration Capabilities](#analysis-of-allmas-extensibility-and-integration-capabilities)
8.  [Allma Repository Structure](#allma-repository-structure)
9.  [GitHub Details](#github-details)

---

## **Allma: The Serverless AI Orchestration Platform**

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment.

---

### **Core Architecture & Principles**

Allma is built entirely on a serverless-first AWS stack, ensuring scalability, resilience, and minimal operational overhead.

*   **Serverless Orchestration:** At its heart is **AWS Step Functions**, which drives the execution of `Flows`. It uses an iterative loop pattern, invoking a central Lambda function to process each step.
*   **Event-Driven Ingestion:** `Flows` are primarily triggered asynchronously via an **SQS queue**, decoupling producers from the core logic and providing durability.
*   **Compute:** Business logic is executed in **AWS Lambda** functions, each with a specific responsibility and scoped with least-privilege IAM roles.
*   **Data & State:**
    *   **DynamoDB:** Stores all versioned configurations (`Flows`, `Prompts`) and detailed execution logs in a single-table design for optimized querying.
    *   **S3:** Implements the "Payload Offload" pattern, storing large data objects (e.g., step inputs/outputs, traces) to overcome service limits and reduce cost.
*   **Security:** Secured end-to-end with **AWS Cognito** for user access, granular **IAM roles** for services, and **AWS Secrets Manager** for credentials.

**High-Level Data Flow:**
`Trigger (API/Event) -> SQS Queue -> Lambda Listener -> Step Functions Orchestrator -> Lambda Step Processor -> Data Layer (DynamoDB/S3) -> Egress (SNS/API)`

---

### **Key Concepts: Flows & Steps**

A **`Flow`** is a versioned, declarative JSON definition of a business process. A **`Step`** is a single unit of work within a `Flow`.

| Concept                   | Description                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Visual Flow Editor**    | A web-based canvas to design `Flows` by dragging, dropping, and connecting `Steps`. Includes a live `Sandbox` for rapid step testing.                                                                                |
| **Versioning & Publishing** | Every change creates a new `Draft` version. Only one version can be `Published` as the "live" version, ensuring safe development and deployment cycles.                                                       |
| **Data Context & Mappings** | A central JSON object (`currentContextData`) carries state through the `Flow`. **JSONPath** expressions are used for powerful `inputMappings` and `outputMappings` to shape data for each step.                 |
| **Conditional Transitions** | `Flows` support `if/else if/else` logic using JSONPath conditions to dynamically route execution down different branches.                                                                                      |
| **Robust Error Handling**   | Each step can be configured with `onError` policies, including exponential backoff **retries** for transient errors, **content-based retries** (e.g., for invalid LLM JSON output), and **fallback steps**. |

---

### **Core Capabilities & Step Types**

Allma provides a rich library of pre-built step types to construct powerful automations.

| Capability                                  | Key Features & Relevant Step Types                                                                                                                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🤖 AI & LLM Integration**                    | **`LLM_INVOCATION`**: <br> • Multi-provider support (Bedrock, Gemini, etc.). <br> • Reusable, versioned **Prompt Templates** with dynamic variable injection. <br> • Guaranteed **JSON Output Mode** with automatic parsing and retries. <br> • Built-in output security validators. |
| **🔗 API & Data Integration**                 | **`API_CALL`**: Make HTTP requests to external services. <br> **`DATA_LOAD` / `DATA_SAVE`**: Use pre-built modules to interact with S3, DynamoDB, SQS, etc. <br> **`CUSTOM_LAMBDA_INVOKE`**: Execute custom logic in your own Lambda functions.                                   |
| **⚡ Parallel Processing**                     | **`PARALLEL_FORK_MANAGER`**: <br> • **In-Memory (`Map`):** Concurrently process dozens or hundreds of items from an array. <br> • **S3 Distributed (`Distributed Map`):** Massively parallel processing for thousands or millions of items from a manifest file in S3.       |
| **⏳ Asynchronous & Long-Running Processes** | **`WAIT_FOR_EXTERNAL_EVENT`**: Pause a `Flow` indefinitely until resumed by an external system via a secure API call, using a business `correlationKey`. <br> **`POLL_EXTERNAL_API`**: Repeatedly call an API until a specific success or failure condition is met.            |

---

### **Management, Monitoring & Debugging: The Allma Admin Panel**

A comprehensive web UI provides complete visibility and control over the platform.

*   **Central Dashboard:** A real-time overview of platform health with KPIs (Total/Successful/Failed Executions), execution trends, and a live feed of recent failures.
*   **Flow & Prompt Management:**
    *   Create, clone, and manage all versions of `Flows` and `Prompts`.
    *   Visually compare changes between versions with a side-by-side diff viewer.
*   **Execution Monitoring:**
    *   Filter and search for any specific flow execution.
    *   Drill into a **detailed, step-by-step execution log** for any run.
    *   Inspect the exact **Input/Output context** for every step, with a **"Diff" view** to see precisely what changed.
    *   View detailed step metadata, such as the final rendered prompt sent to an LLM and its raw response.

---

### **🚀 Advanced Debugging Suite**

Allma's debugging tools dramatically accelerate development and troubleshooting.

| Tool                 | Description                                                                                                                                                                                                     | Use Case                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flow Redrive**     | Re-run a completed or failed execution from the beginning using the exact same initial input.                                                                                                                   | Re-test a flow after fixing an external dependency (e.g., a bug in an API it calls).                                                                                |
| **Stateful Redrive** | **(Time Machine)** Restart a failed flow execution from any specific step. You can **edit the flow's context data** before resuming, effectively teleporting the execution to the point of failure with corrected data. | A flow fails on step 8 due to bad data from step 3. Instead of re-running all 8 steps, you start at step 8 with the corrected data, verifying the fix in seconds. |
| **Sandbox Execution**  | Execute any single step in complete isolation directly from the Flow Editor. Provide a mock input context and instantly see the step's output, error, and logs without running the entire flow.              | Rapidly iterate on a complex prompt or data transformation. Tweak the step's configuration and test it dozens of times in minutes instead of hours.              |

---

### **Analysis of Allma's Extensibility and Integration Capabilities**

The Allma platform is architecturally designed as a modular and extensible system. It provides a robust core for workflow orchestration while offering two primary axes of extension: the **Backend** (through custom Lambdas and API calls within a Flow) and the **Frontend** (through a powerful plugin system for the Admin Panel).

#### **1. Backend Extensibility (Flow Steps)**

The backend extension patterns remain a core strength, allowing deep integration with proprietary business logic.

1.  **Direct Code Execution (`CUSTOM_LAMBDA_INVOKE`):** The most powerful pattern. Allows a `Flow` to directly invoke a proprietary AWS Lambda function, enabling complex business rules and legacy system integration.
2.  **Service-Oriented Integration (`API_CALL`):** Ideal for interacting with existing internal microservices or third-party vendors via HTTP/S endpoints.
3.  **Event-Driven Architecture (SQS/SNS):** The platform's event-driven nature allows for seamless, decoupled integration. Any application can trigger a `Flow` by sending a message to an SQS queue, and `Flows` can publish their results to an SNS topic for downstream consumption.

#### **2. Frontend Extensibility (Admin Shell Plugins)**

The `@allma/admin-shell` is not a monolithic application but a true shell or framework. This allows consumers to build a completely customized Admin Panel by composing the shell with a set of desired plugins. This is the primary mechanism for extending the user interface.

*   **Mechanism:** A consumer creates a small React application (see `examples/basic-deployment/src/admin-app`) that imports the `createAllmaAdminApp` function from `@allma/admin-shell`. They also import the plugins they need (either custom-built or from third parties) and pass them to this function. The shell then dynamically assembles the UI, including all routes, navigation links, and custom components provided by the plugins.

*   **The `AllmaPlugin` Contract:** The power of this system comes from its well-defined plugin interface (`@allma/core-types/plugins/plugin.d.ts`). A plugin is an object that can provide:
    *   **Routes:** An array of React Router objects to be added to the application's routing table.
    *   **Navigation Items:** Links to be rendered in the main sidebar.
    *   **App Wrappers:** A React component that can wrap the entire application, perfect for adding global state providers (e.g., React Context).
    *   **Header Widgets:** A React component to be rendered in a designated "slot" in the main application header, ideal for adding user-specific menus or action buttons.

*   **Use Case:** An organization could create a custom `BillingPlugin` that adds new screens for managing subscriptions, a `ReportingPlugin` that provides custom analytics dashboards, or a `ThemePlugin` that uses the `AppWrapper` to inject custom CSS and branding. This model provides limitless UI extensibility without requiring any changes to the core Allma codebase.

#### **2. Strategic Benefits of Using Allma as a Core Component**

Adopting Allma as the central orchestrator offers significant engineering and business advantages over building and maintaining a bespoke orchestration solution.

*   **Accelerated Development:** Allma abstracts away the "undifferentiated heavy lifting" of workflow orchestration. Your development teams can focus on writing the business logic within their custom Lambdas, not on building complex state machines, robust retry/error handling, payload offloading (S3 integration), or detailed logging infrastructure.
*   **Unparalleled Observability & Debugging:** The Admin Panel is a production-grade operations and debugging tool that would require significant engineering investment to replicate. Features like **Stateful Redrive** (the "time machine") and **Sandbox Execution** are not just conveniences; they are powerful accelerators that can reduce debugging time for complex distributed processes from hours or days to minutes.
*   **Built-in Governance and Safety:** The mandatory versioning and `Draft`/`Published` lifecycle enforces a safe deployment process. It prevents ad-hoc changes to production workflows and provides a clear audit trail, which is critical for compliance and stability.
*   **Democratized AI Integration:** The `LLM_INVOCATION` step provides a secure, abstracted, and templated way to embed generative AI into any business process. It handles multi-provider complexity, secure prompting, and output validation, allowing teams to leverage AI without each needing to become experts in the intricacies of Bedrock or other model APIs.
*   **Reduced Operational Overhead:** Being fully serverless, the platform scales automatically with demand and follows a pay-per-use model. There are no servers to patch, manage, or scale, freeing up operations teams.

#### **3. Integration Effort and Prerequisites**

The integration effort can be categorized as follows:

*   **API & Event-Level Integration (Low Effort):** Triggering `Flows` via SQS or the API Gateway, and consuming results from an SNS topic, is trivial. It requires basic knowledge of AWS SDKs and standard integration patterns. **This is the easiest entry point.**

*   **Infrastructure & Code-Level Integration (Medium Effort):** Integrating custom Lambda functions requires proficiency with the AWS CDK and a disciplined approach to IAM security.
    *   **IaC (CDK):** Your business module's CDK stack will need to reference Allma's core stack outputs (e.g., the `OrchestrationLambdaRole` ARN). This is a standard CDK cross-stack reference pattern. The integrating team must be comfortable defining their resources (like their custom Lambda) in TypeScript using the CDK.
    *   **IAM Security (Critical):** This is the most crucial aspect. To allow Allma's orchestrator to call your custom Lambda, you must grant `lambda:InvokeFunction` permissions to the `OrchestrationLambdaRole` for your specific function ARN. This must be done carefully, adhering to the principle of least privilege. A deep understanding of IAM is non-negotiable for the integrating engineer.
    *   **Type Safety:** The integration will be most successful and maintainable if the custom business Lambdas adhere to the shared types provided by the `@allma/core-types` package for their event inputs and return values. This ensures compile-time safety and alignment with the platform's data contracts.

---

## **Allma Repository Structure**

The Allma project is structured as a monorepo using `npm` workspaces. This approach streamlines development, dependency management, and releases for our interconnected packages.

### Acceptance Criteria

-   A developer can clone the repository, run `npm install` at the root, and have all package dependencies installed.
-   Changes can be made across multiple packages (e.g., a type change in `@allma/core-types` and its usage in `@allma/core-cdk`) in a single commit.
-   CI/CD pipelines can easily build, test, and publish all packages from one workflow.

### Directory Layout

```plaintext
allma-core/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Runs on PRs: lint, test, build
│       └── release.yml            # Runs on merge to main: version, publish, create release
├── .changeset/                    # Stores pending version changes (for Changesets)
│   └── config.json
├── examples/
│   └── basic-deployment/          # A minimal, best-practice customer deployment project
│       ├── bin/
│       │   └── basic-allma-app.ts # Customer's CDK entrypoint
│       ├── config/
│       │   └── allma.config.ts    # Customer's Allma configuration file
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── packages/
│   ├── admin-shell/          # Source for the @allma/admin-shell React framework
│   │   ├── src/
│   │   │   ├── components/   # Core, un-opinionated UI components (Sidebar, etc.)
│   │   │   ├── harness/      # A local development environment for testing plugins
│   │   │   └── createAllmaAdminApp.tsx # The main exported function
│   │   ├── vite.harness.config.ts
│   │   └── package.json
│   ├── ui-components/        # Source for the @allma/ui-components shared UI components
│   │   ├── src/
│   │   └── package.json
│   ├── cdk-integration-utils/ # Source for the @allma/cdk-integration-utils npm package
│   │   ├── src/
│   │   └── package.json
│   ├── core-cdk/             # Source for the @allma/core-cdk npm package
│   │   ├── bin/
│   │   ├── lib/
│   │   └── package.json
│   ├── app-logic/            # Lambda business logic (a private package, bundled by CDK)
│   │   ├── src/
│   │   └── package.json
│   ├── core-sdk/             # Source for the @allma/core-sdk npm package
│   │   ├── src/
│   │   └── package.json
│   └── core-types/           # Source for the @allma/core-types npm package
│       ├── src/
│       └── package.json
├── .gitignore
├── package.json                  # Root package.json defining the workspace
├── tsconfig.base.json            # Shared TypeScript configuration
└── README.md
```

### Key Files & Configuration

#### Root `package.json`

This file defines the `npm` workspace, tying all the packages together.

```json
{
  "name": "allma-monorepo",
  "private": true,
  "version": "1.0.0",
  "description": "The Serverless AI Orchestration Platform",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run build --watch",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "npm run clean -ws --if-present && rm -rf node_modules package-lock.json"
  },
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "typescript": "^5.8.3",
    "rimraf": "^5.0.5",
    "eslint": "^8.57.0"
  }
}
```

#### CDK Package `packages/core-cdk/package.json`

This is an example of a public package that will be published to `npm`. Note the `main`, `types`, and `files` fields.

```json
{
  "name": "@allma/core-cdk",
  "version": "1.0.0",
  "description": "Core AWS CDK constructs for deploying the Allma platform.",
  "main": "dist/lib/allma-stack.js",
  "types": "dist/lib/allma-stack.d.ts",
  "type": "module",
  "files": [
    "dist/",
    "bin/",
    "lib/",
    "config/"
  ],
  "scripts": {
    "build": "tsc",
    "cdk": "cdk"
  },
  "dependencies": {
    "@allma/core-types": "^1.0.0",
    "aws-cdk-lib": "^2.130.0",
    "constructs": "^10.3.0"
  },
  "devDependencies": {
    "aws-cdk": "^2.130.0",
    "typescript": "^5.8.3",
    "ts-node": "^10.9.2"
  }
}
```

#### Private Logic Package `packages/app-logic/package.json`

The Lambda logic is a private package. It's built during development but never published, as its code is bundled directly into the CDK deployment assets.

```json
{
  "name": "allma-app-logic",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@allma/core-sdk": "^1.0.0",
    "@allma/core-types": "^1.0.0",
    "@aws-sdk/client-dynamodb": "^3.500.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitest": "^1.2.0"
  }
}
```

This structure ensures that internal packages are correctly referenced during development and that public packages are properly configured for publishing.

---

## **GitHub Details**

*   **Repository URL:** `https://github.com/ALLMA-dev/allma-core`
*   **Clone URL (HTTPS):** `https://github.com/ALLMA-dev/allma-core.git`


# Allma Project: Engineering Coding Style Guide

## 1. Introduction

This document outlines the coding standards, patterns, and architectural principles for the Allma project. Its purpose is to ensure that our codebase is consistent, maintainable, secure, and scalable. Adherence to this guide is mandatory for all contributors.

Our development philosophy is guided by these core principles:

*   **SOLID**: Our code should be structured in a way that is easy to maintain and extend over time. We favor composition over inheritance and clear, single-purpose modules.
*   **DRY (Don't Repeat Yourself)**: Avoid code duplication by creating reusable services, utilities, and shared types. Our monorepo structure with `allma-types` and `core-sdk` packages is a direct implementation of this principle.
*   **Clean and Readable**: Code is read far more often than it is written. Prioritize clarity, simplicity, and meaningful names over clever but obscure implementations.
*   **Secure by Design**: Security is not an afterthought. We build security into every layer, from infrastructure to application logic, following the principle of least privilege and validating all inputs.
*   **Configuration as Code**: All configurable aspects of the system, from infrastructure resources to application behavior, must be defined as code and version-controlled.

## 2. Project Structure (Monorepo)

The project is a TypeScript monorepo with distinct, interdependent packages. Each package has a clear responsibility.

*   **Rule**: Code must be placed in the appropriate package based on its function.
*   **Rationale**: This separation of concerns is critical for maintainability, independent testing, and preventing circular dependencies.

| Package Name          | Responsibility                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `allma-cdk`           | **Infrastructure as Code (IaC)**. Defines all AWS resources using the AWS CDK.                                 |
| `allma-types`         | **Shared Contracts**. Contains all shared TypeScript types, interfaces, enums, constants, and Zod schemas.      |
| `allma-sdk`           | **Shared Utilities**. Reusable, non-domain-specific logic for Lambda functions (e.g., logger, S3 utils, auth). |
| `allma-app-logic`     | **Business Logic**. Contains the source code for all Lambda functions and core application logic.              |
| `allma-admin-shell` | **Frontend UI**. The React-based admin panel application.                                                      |
| `allma-ui-components` | **Shared React Components**. Reusable Mantine-based UI components for the admin shell.                         |

## 3. General Conventions

### 3.1. File Naming

*   **Rule**: Use kebab-case for filenames (e.g., `flow-definition.service.ts`).
*   **Rule**: For React components, use PascalCase (e.g., `StepEditorPanel.tsx`).
*   **Rationale**: Consistency makes files easier to find and navigate.

### 3.2. Code Formatting

*   **Rule**: All code must be formatted using the project's configured Prettier and ESLint rules before committing. Use the provided IDE extensions or run the `lint` and `format` scripts.
*   **Rationale**: Automated formatting eliminates debates about style and ensures a uniform codebase.

### 3.3. Commenting

*   **Rule**: Write comments for *why*, not *what*. The code should be self-documenting in what it does. Comments should explain complex logic, business reasons, or workarounds.
*   **Rule**: Use JSDoc for all public functions, classes, and complex types, especially in the `allma-types` and `core-sdk` packages.

```typescript
/**
 * Recursively makes all properties of an object optional.
 * This is a utility type for creating partial configurations.
 */
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
```

## 4. TypeScript & JavaScript Conventions

### 4.1. Modularity

*   **Rule**: Use ES Modules (`import`/`export`) exclusively. Do not use `require`.
*   **Rule**: All file imports must include the `.js` extension, as is standard for ES Modules in Node.js.
    ```typescript
    // Correct
    import { AllmaStack } from '../lib/allma-stack.js';

    // Incorrect
    import { AllmaStack } from '../lib/allma-stack';
    ```
*   **Rationale**: This is the modern standard and is enforced across the project for consistency.

### 4.2. Typing

*   **Rule**: Avoid `any` whenever possible. Use `unknown` for unknown inputs and perform type checking. Use specific interfaces or types from the `@allma/allma-types` package.
*   **Rule**: Use `const` by default. Use `let` only when a variable must be reassigned.
*   **Rule**: Use native TypeScript `enum` for sets of named constants (e.g., `StepType`, `AdminRole`).
*   **Rule**: Use `readonly` for class properties and array types that should not be mutated.

### 4.3. Asynchronous Code

*   **Rule**: Use `async/await` for all asynchronous operations. Avoid `.then()` and callbacks.
*   **Rule**: All asynchronous functions must have a return type of `Promise<T>`.

### 4.4. Constants

*   **Rule**: Do not use magic strings or numbers. Define them as constants in a relevant file. For shared constants, add them to the `@allma/allma-types` package (e.g., `ENV_VAR_NAMES`, `ALLMA_ADMIN_API_ROUTES`).
*   **Rationale**: Centralized constants prevent typos and make global changes easy.

## 5. Architecture & Design Patterns

### 5.1. Configuration Management

*   **Pattern**: Stage-specific configuration is managed through a deep-merge pattern.
*   **Rule**: All new configuration parameters must be added to `packages/allma-core/cdk/config/default.config.ts` with a sensible default value.
*   **Rule**: Stage-specific overrides (e.g., domain names, ARNs, resource capacities) must be placed in the corresponding `dev.config.ts`, `beta.config.ts`, etc. Never hardcode these values directly in CDK constructs.
*   **Rationale**: This pattern provides a clear, version-controlled source of truth for all environments and makes it easy to compare configurations.

### 5.2. Generic, Reusable Services

*   **Pattern**: For complex, repeated data access patterns (like our versioned entities in DynamoDB), create generic, reusable service classes.
*   **Example**: The `VersionedEntityManager` class provides a robust, transactional framework for managing any versioned data model.
*   **Rule**: When implementing a new data model that follows a similar pattern (e.g., metadata record + version records), leverage or extend existing generic services before writing new data access logic from scratch.
*   **Rationale**: This adheres to DRY, reduces bugs, and standardizes data access across the application.

### 5.3. Middleware Pattern for Lambdas

*   **Pattern**: Use higher-order functions (middleware) to encapsulate cross-cutting concerns for API Lambda handlers.
*   **Example**: The `withAdminAuth` function in the `core-sdk` wraps a handler to perform authentication and authorization checks before executing the core business logic.
*   **Rule**: Any new, reusable logic that applies to multiple API endpoints (e.g., request logging, feature flagging) should be implemented as a middleware function.
*   **Rationale**: This keeps the core handler logic clean and focused on its specific task.

## 6. AWS CDK (Infrastructure as Code)

### 6.1. Structure and Composition

*   **Rule**: The main stack file (`allma-stack.ts`) should primarily be used for composing high-level constructs.
*   **Rule**: All related resources should be grouped into a logical `Construct` (e.g., `AllmaDataStores`, `AllmaCompute`). Each construct must be in its own file within the `lib/constructs/` directory.
*   **Rule**: Constructs must receive dependencies (like `stageConfig` or resources from other constructs) via their props interface. They should expose created resources as `public readonly` properties.

### 6.2. Resource Naming

*   **Rule**: All AWS resources must be named with a stage suffix (e.g., `-dev`, `-beta`, `-prod`). This should be driven by the `stageConfig`.
*   **Example**: `queueName: \`AllmaFlowStartRequestQueue-${stageConfig.stage}\``
*   **Rationale**: This is critical for preventing resource collisions in multi-environment AWS accounts.

### 6.3. Security

*   **Rule**: Adhere to the Principle of Least Privilege. IAM Roles must be granted only the permissions they absolutely need.
*   **Rule**: Define IAM roles within the constructs that use them (e.g., the `AllmaCompute` construct defines the roles for its Lambdas).
*   **Rule**: Prefer specific `grant*` methods (e.g., `table.grantReadData(myRole)`) over manually creating `iam.PolicyStatement` objects where possible.

## 7. Lambda Functions (Business Logic)

### 7.1. Handler Structure

*   **Rule**: A Lambda handler's primary responsibility is to parse input, delegate business logic to service classes or functions, and format the output.
*   **Rule**: Handlers should be thin. Complex logic must be extracted into separate, testable service files (e.g., `flow-definition.service.ts`).

### 7.2. Observability

*   **Rule**: Use the structured JSON logger from `@allma/core-sdk` for all logging (`log_info`, `log_error`, etc.). Do not use `console.log`.
*   **Rule**: Always include the `correlationId` (e.g., `flowExecutionId`) in log calls to enable distributed tracing.
*   **Rationale**: Structured logs are machine-readable and essential for effective monitoring and debugging in CloudWatch Logs Insights.

### 7.3. Error Handling

*   **Rule**: Distinguish between transient and permanent errors.
*   **Rule**: For errors that the Step Function should retry (e.g., temporary API failures, throttling), throw a `RetryableStepError` or `TransientStepError`.
*   **Rule**: For configuration errors or permanent failures, throw a `PermanentStepError` or a standard `Error`.
*   **Rationale**: This pattern allows us to build resilient, self-healing workflows by leveraging Step Functions' native retry capabilities.

### 7.4. Payload Management

*   **Rule**: Be mindful of the 256KB payload limit in Step Functions.
*   **Rule**: For any data that *could* exceed this limit (e.g., LLM outputs, file content), use the `offloadIfLarge` utility from the `core-sdk` to store the payload in S3 and pass a pointer instead.
*   **Rule**: Use the `hydrateInputFromS3Pointers` utility to transparently resolve S3 pointers in a step's input.

## 8. Data Modeling & Validation

### 8.1. Data Contracts with Zod

*   **Rule**: Define a Zod schema for every data structure that crosses an application boundary (API requests/responses, database items, SFN payloads).
*   **Rule**: All schemas must reside in the `@allma/allma-types` package.
*   **Rule**: Parse and validate all incoming data at the application boundary (e.g., start of a Lambda handler) using the corresponding Zod schema.
*   **Rationale**: Zod provides both compile-time type safety and runtime validation, preventing invalid data from propagating through the system.

### 8.2. DynamoDB Design

*   **Pattern**: The project uses Single-Table Design with a composite primary key (`PK`, `SK`).
*   **Rule**: The `PK` should identify the entity (e.g., `FLOW_DEF#<flowId>`). The `SK` should define the item type within that entity (e.g., `METADATA`, `VERSION#1`).
*   **Rule**: All data access must be encapsulated within service classes (e.g., `VersionedEntityManager`). Do not perform direct `ddbDocClient` calls from Lambda handlers.

## 9. Frontend (React)

### 9.1. State Management

*   **Rule**: Use **React Query** (`@tanstack/react-query`) for all server state (fetching, caching, and mutating data from the backend API).
*   **Rule**: Use **Zustand** for complex, global client state (e.g., the flow editor state). For simple, local component state, use `useState`.
*   **Rationale**: This provides a robust, standardized pattern for managing data, caching, and background refetching, leading to a more performant and reliable UI.

### 9.2. API Layer

*   **Rule**: All API interactions must go through the shared `axiosInstance`.
*   **Rule**: Create custom hooks that encapsulate React Query calls for specific API endpoints (e.g., `useGetFlows`, `useUpdateFlowVersion`). Place these hooks in service files within the `src/api/` directory.
*   **Rationale**: This creates a clean, reusable data-fetching layer and decouples components from the specifics of API calls.

### 9.3. Component Structure

*   **Rule**: Organize components by feature in the `src/features/` directory.
*   **Rule**: Create shared, reusable UI components in the separate `@allma/ui-components` package.

## 10. General rules

### 10.1. When you see a file can be split on few logical parts, it's better to split it to make more clear code
### 10.2. Never duplicate any logic. As soon as you see some logic repeats, make it generic and reuse.

## 11. LINT rules

### 11.1. ALWAYS follow LINT rules which you can read from @/eslint.config.js
