# ALLMA Platform — Guide for AI Agents

This document is the authoritative guide for AI agents working in this repository. It describes the **Allma platform**: its architecture, repository layout, and the engineering standards that all platform code must follow.

> This file is part of the public Allma repository. It documents **only the Allma platform itself** — never any specific product built on top of it.

---

### Table of Contents
1. [Repository Boundaries (READ FIRST)](#repository-boundaries-read-first)
2. [Task Routing](#task-routing)
3. [Platform Documentation (Where to Read About Allma)](#platform-documentation-where-to-read-about-allma)
4. [Allma: The Serverless AI Orchestration Platform](#allma-the-serverless-ai-orchestration-platform)
5. [Core Architecture & Principles](#core-architecture--principles)
6. [Key Concepts: Flows & Steps](#key-concepts-flows--steps)
7. [Core Capabilities & Step Types](#core-capabilities--step-types)
8. [Management, Monitoring & Debugging: The Allma Admin Panel](#management-monitoring--debugging-the-allma-admin-panel)
9. [Advanced Debugging Suite](#advanced-debugging-suite)
10. [Extensibility & Integration](#extensibility--integration)
11. [Repository Structure](#repository-structure)
12. [Engineering Coding Style Guide](#engineering-coding-style-guide)
13. [GitHub Details](#github-details)

---

## Repository Boundaries (READ FIRST)

This repository contains **two distinct kinds of code**, and they must never be mixed.

### 1. Platform code — the only thing this repo ships
- Location: `packages/*` and `allma.cdk/` (plus `docs.allma.dev/` for the documentation site).
- This is the reusable, generic Allma platform. It is published to npm under the `@allma/*` scope and deployed via CDK.
- **Platform code must remain product-agnostic.** It must never contain logic, names, types, or assumptions specific to any application built on Allma. Anything can be built on Allma — the platform must know nothing about what.

### 2. Example / consumer applications — not part of this repo's shipped product
- Location: `examples/*`.
- The entire `examples/` directory is **gitignored** in this repository (`**/examples/*`). Example apps live in their **own separate git repositories** and are checked out here only for local development against the platform.
- Each example app carries **its own `AGENTS.md`** with its own rules. When you work inside `examples/<app>/`, that file is the authority — not this one.

### Hard rules
- **Never reference a specific consumer application by name in this file or anywhere in `packages/*` / `allma.cdk/`.** When a concrete deployment must be illustrated, refer only to the generic demo, `examples/basic-deployment`, and only in generic terms.
- **Do not modify platform source to solve an example app's problem.** From an example app's perspective, `@allma/*` packages are published, read-only dependencies. If an example genuinely needs a platform change, raise it as a separate, platform-scoped task.
- **Do not let example-specific concepts leak into the platform** (types, constants, copy, branding, business rules).

---

## Task Routing

Before editing anything, classify the task and confirm scope:

| If the task is about…                                              | Work in…                       | Authoritative rules            |
| ------------------------------------------------------------------ | ------------------------------ | ------------------------------ |
| Flow engine, step types, admin shell, SDK, types, CDK constructs   | `packages/*`, `allma.cdk/`     | **This file**                  |
| Understanding how a feature/step/API behaves                       | Read `docs.allma.dev/docs/`    | See [Platform Documentation](#platform-documentation-where-to-read-about-allma) |
| The documentation website (content or site config)                 | `docs.allma.dev/`              | This file + that package       |
| A consumer/example application                                     | `examples/<app>/`              | `examples/<app>/AGENTS.md`     |

Guidance:
- If a request is ambiguous about whether it targets the platform or an example app, **ask before editing across that line.**
- A platform task must not edit `examples/*`. An example task must not edit `packages/*` or `allma.cdk/` (treat the platform as a dependency).
- When opening files for context inside `examples/<app>/`, defer to that app's `AGENTS.md` for build, test, and style conventions.

---

## Platform Documentation (Where to Read About Allma)

The sections below in this file are a **high-level summary**. The complete, authoritative, human-facing documentation of how the platform behaves lives in the repository under **`docs.allma.dev/docs/`** (a Docusaurus 3 site). **Read it before designing or changing platform behavior** — especially when adding or modifying a step type, an admin API, or flow semantics. The Markdown/MDX sources are the source of truth; the live site at `https://docs.allma.dev` is built from them by CI.

### Where things are

| You need to understand…                                   | Read under `docs.allma.dev/docs/`                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| What Allma is, install, first run                         | `getting-started/` (`introduction.md`, `quick-start.md`)                                           |
| Core mental model (flows, steps, context, versioning)     | `getting-started/key-concepts/` (`flows-and-steps.md`, `data-context.md`, `versioning-publishing.md`, `architecture-principles.md`) |
| Task-oriented walkthroughs                                | `how-to-guides/` (first AI flow, external APIs, parallel workloads, long-running, error handling)  |
| **Every step type** (config, inputs, outputs, examples)   | `reference/step-types/` — numbered by family (`01-llm-invocation.md`, `02-api-call.md`, `04-flow-control/`, `05-data-load/`, `06-data-save/`, `07-data-transformation/`, `08-messaging/`, `09-triggers/`, plus `mcp-call.md`, `file-download.md`) |
| The flow definition JSON schema                           | `reference/flow-definition-reference.md`                                                           |
| The admin/management REST APIs                            | `reference/admin-api/` (flow management, flow control, execution monitoring, prompt management)    |
| Contributing / deep architecture / maintainer process    | `community/` (`architecture-deep-dive.mdx`, `contribution-guide.mdx`, `contribution-tutorial.mdx`, `maintainer-guide.mdx`) |

### How to read & keep it in sync

- **Read first, code second.** When a task touches a step type or admin API, open its reference page under `docs.allma.dev/docs/reference/` for the contract and examples before editing `packages/*`.
- **Docs are part of the change.** When you change platform behavior (a step's config/inputs/outputs, an API, flow semantics), update the matching page under `docs.allma.dev/docs/` in the same PR so the docs never drift from the code.
- **Keep docs product-agnostic** — the same rules as platform code apply (no consumer/product names; only the generic `examples/basic-deployment` demo).
- **Validate** doc changes with `npm run build --prefix docs.allma.dev`. `onBrokenLinks: 'throw'` is set, so a broken internal link fails the build. Building also catches malformed MDX. For docs-only PRs, add an *empty* changeset in `.changeset/` (the docs site package is private and unpublished). See the `docs.allma.dev/` package for its own conventions.

---

## Allma: The Serverless AI Orchestration Platform

**Allma is a serverless, event-driven platform for building, executing, and managing complex, AI-powered automated workflows, known as `Flows`.** It orchestrates sophisticated business processes by combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment.

---

## Core Architecture & Principles

Allma is built on a serverless-first AWS stack for scalability, resilience, and minimal operational overhead.

- **Serverless Orchestration:** **AWS Step Functions** drives execution of `Flows`, using an iterative loop pattern that invokes a central Lambda to process each step.
- **Event-Driven Ingestion:** `Flows` are primarily triggered asynchronously via an **SQS queue**, decoupling producers from core logic and providing durability.
- **Compute:** Business logic runs in **AWS Lambda** functions, each scoped with least-privilege IAM roles.
- **Data & State:**
  - **DynamoDB:** Stores versioned configurations (`Flows`, `Prompts`) and execution logs in a single-table design.
  - **S3:** Implements the "Payload Offload" pattern for large objects to overcome service limits and reduce cost.
- **Security:** **AWS Cognito** for user access, granular **IAM roles** for services, and **AWS Secrets Manager** for credentials.

**High-Level Data Flow:**
`Trigger (API/Event) -> SQS Queue -> Lambda Listener -> Step Functions Orchestrator -> Lambda Step Processor -> Data Layer (DynamoDB/S3) -> Egress (SNS/API)`

---

## Key Concepts: Flows & Steps

A **`Flow`** is a versioned, declarative JSON definition of a business process. A **`Step`** is a single unit of work within a `Flow`.

| Concept                     | Description                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visual Flow Editor**      | A web-based canvas to design `Flows` by connecting `Steps`. Includes a live `Sandbox` for rapid step testing.                                                           |
| **Versioning & Publishing** | Every change creates a new `Draft` version. Only one version can be `Published` as the live version, ensuring safe development and deployment cycles.                   |
| **Data Context & Mappings** | A central JSON object (`currentContextData`) carries state through the `Flow`. **JSONPath** expressions drive `inputMappings` and `outputMappings`.                     |
| **Conditional Transitions** | `Flows` support `if/else if/else` logic using JSONPath conditions to dynamically route execution.                                                                      |
| **Robust Error Handling**   | Each step can configure `onError` policies: exponential-backoff **retries**, **content-based retries** (e.g., invalid LLM JSON), and **fallback steps**.               |

---

## Core Capabilities & Step Types

| Capability                          | Key Features & Step Types                                                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🤖 AI & LLM Integration**         | **`LLM_INVOCATION`**: multi-provider support (Bedrock, Gemini, etc.); reusable versioned **Prompt Templates** with dynamic variable injection; guaranteed **JSON Output Mode** with parsing and retries; output validators.    |
| **🔗 API & Data Integration**       | **`API_CALL`**: HTTP requests to external services. **`DATA_LOAD` / `DATA_SAVE`**: interact with S3, DynamoDB, SQS, etc. **`CUSTOM_LAMBDA_INVOKE`**: execute custom logic in consumer-owned Lambda functions.                  |
| **⚡ Parallel Processing**          | **`PARALLEL_FORK_MANAGER`**: in-memory (`Map`) for arrays of items, and S3 distributed (`Distributed Map`) for massive parallelism from an S3 manifest.                                                                        |
| **⏳ Async & Long-Running**         | **`WAIT_FOR_EXTERNAL_EVENT`**: pause a `Flow` until resumed via a secure API call keyed by a business `correlationKey`. **`POLL_EXTERNAL_API`**: repeatedly call an API until a success/failure condition is met.              |

---

## Management, Monitoring & Debugging: The Allma Admin Panel

A web UI provides complete visibility and control.

- **Central Dashboard:** Real-time platform health with KPIs, execution trends, and a live feed of recent failures.
- **Flow & Prompt Management:** Create, clone, and version `Flows` and `Prompts`; compare versions with a side-by-side diff viewer.
- **Execution Monitoring:** Filter/search executions; drill into step-by-step logs; inspect exact Input/Output context per step with a "Diff" view; view step metadata such as the final rendered prompt and raw LLM response.

---

## Advanced Debugging Suite

| Tool                   | Description                                                                                                                                                  | Use Case                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Flow Redrive**       | Re-run a completed or failed execution from the beginning with the exact same initial input.                                                                | Re-test a flow after fixing an external dependency.                                            |
| **Stateful Redrive**   | Restart a failed execution from any step, optionally **editing the context data** before resuming.                                                          | A flow fails at step 8 due to bad data from step 3 — restart at step 8 with corrected data.    |
| **Sandbox Execution**  | Execute a single step in isolation from the Flow Editor with a mock input context, seeing output, error, and logs without running the whole flow.           | Rapidly iterate on a complex prompt or transformation.                                         |

---

## Extensibility & Integration

Allma is a modular, extensible system with two primary axes of extension: the **backend** (custom Lambdas and API calls within a Flow) and the **frontend** (an Admin Panel plugin system).

### Backend Extensibility (Flow Steps)
1. **Direct Code Execution (`CUSTOM_LAMBDA_INVOKE`):** A `Flow` invokes a consumer-owned AWS Lambda for proprietary business rules and legacy integration.
2. **Service-Oriented Integration (`API_CALL`):** Interact with internal microservices or third-party vendors over HTTP/S.
3. **Event-Driven Architecture (SQS/SNS):** Any system can trigger a `Flow` via SQS; `Flows` can publish results to SNS for downstream consumption.

### Frontend Extensibility (Admin Shell Plugins)
`@allma/admin-shell` is a shell/framework, not a monolithic app. A consumer composes a custom Admin Panel from the shell plus plugins.

- **Mechanism:** A consumer app imports `createAllmaAdminApp` from `@allma/admin-shell`, passes in the desired plugins, and the shell assembles routes, navigation, and components. See `examples/basic-deployment/src/admin-app` for the generic pattern.
- **The `AllmaPlugin` contract** (`@allma/core-types`) lets a plugin provide: **Routes**, **Navigation Items**, **App Wrappers** (global providers), and **Header Widgets**.
- This model provides UI extensibility without changing the core Allma codebase.

### Integration Effort
- **API & Event-Level (Low):** Triggering `Flows` via SQS/API Gateway and consuming SNS results requires only standard AWS SDK usage. Easiest entry point.
- **Infrastructure & Code-Level (Medium):** Integrating custom Lambdas requires AWS CDK proficiency and disciplined IAM.
  - **IaC (CDK):** A consumer stack references Allma core stack outputs (e.g., the orchestration Lambda role ARN) via standard cross-stack references.
  - **IAM (Critical):** Grant `lambda:InvokeFunction` to Allma's orchestration role for the specific function ARN, adhering to least privilege.
  - **Type Safety:** Custom Lambdas should adhere to the shared contracts in `@allma/core-types` for inputs and return values.

---

## Repository Structure

Allma is an `npm` workspaces monorepo, orchestrated with **Turborepo** and versioned with **Changesets**.

### Acceptance Criteria
- A developer can clone the repo, run `npm install` at the root, and have all workspace dependencies installed.
- Changes can span multiple packages (e.g., a type change in `@allma/core-types` and its usage in `@allma/core-cdk`) in a single commit.
- CI/CD can build, test, and publish all packages from one workflow.

### Directory Layout

```plaintext
allma-core/
├── .changeset/                 # Changesets config + pending version changes
├── .github/workflows/          # CI (lint/test/build) and release pipelines
├── allma.cdk/                  # Root CDK app that deploys Allma's public websites
│   ├── bin/                    #   entrypoint (bin: allma-websites)
│   └── lib/
├── assets/                     # Static assets used across the repo
├── docs.allma.dev/             # Docusaurus documentation site
├── packages/                   # The publishable + private platform packages
│   ├── admin-shell/            # @allma/admin-shell — React shell/framework for the Admin Panel
│   │   └── src/{components,harness}/  + createAllmaAdminApp.tsx
│   ├── ui-components/          # @allma/ui-components — shared Mantine-based UI components
│   ├── cdk-integration-utils/  # @allma/cdk-integration-utils — CDK helpers for consumers
│   ├── core-cdk/               # @allma/core-cdk — core AWS CDK constructs for the platform
│   ├── core-sdk/               # @allma/core-sdk — shared Lambda utilities (logger, S3, auth…)
│   ├── core-types/             # @allma/core-types — shared types, enums, constants, Zod schemas
│   └── app-logic/              # allma-app-logic (PRIVATE) — Lambda business logic, bundled by CDK
├── examples/                   # GITIGNORED. Independent consumer apps in their own repos.
│   └── basic-deployment/       # The generic demo deployment (see its own AGENTS.md)
├── eslint.config.js            # ESLint 9 flat config (shared)
├── tsconfig.base.json          # Shared TypeScript configuration
├── turbo.json                  # Turborepo pipeline
├── package.json                # Root workspace definition
└── README.md
```

### Package Reference

| Package                          | Published? | Responsibility                                                                  |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `@allma/core-cdk`                | Yes        | Core AWS CDK constructs for deploying the Allma platform.                       |
| `@allma/cdk-integration-utils`   | Yes        | CDK helper utilities for consumers integrating with Allma.                      |
| `@allma/core-types`              | Yes        | Shared TypeScript types, interfaces, enums, constants, and Zod schemas.         |
| `@allma/core-sdk`                | Yes        | Reusable, non-domain Lambda utilities (logger, S3 utils, auth middleware).      |
| `@allma/admin-shell`             | Yes        | React shell/framework for composing the Admin Panel from plugins.               |
| `@allma/ui-components`           | Yes        | Shared Mantine-based React UI components.                                        |
| `allma-app-logic`                | No (private) | Lambda business logic; never published — bundled into CDK deployment assets.  |

### Key Configuration Notes
- **Root `package.json`** declares `workspaces: ["packages/*", "examples/*"]` and exposes `build`, `dev`, `lint`, `test` scripts that fan out through Turbo. Examples are included as workspaces for local development only; they are not published.
- **Published packages** (`@allma/*`) set `main`, `types`, and `files` for npm distribution and build with `tsc`/`tsup`. Do not add product-specific dependencies to them.
- **`allma-app-logic`** is `private: true`, builds with `tsc`, and is tested with Vitest. Its code is bundled directly into CDK deployment assets rather than published.

---

## Engineering Coding Style Guide

Adherence to this guide is mandatory for all **platform** contributions. Core principles: **SOLID**, **DRY**, **Clean and Readable**, **Secure by Design**, and **Configuration as Code**.

### Project Structure (Monorepo)
Place code in the package that matches its responsibility (see the Package Reference table above). This separation enables independent testing and prevents circular dependencies.

### General Conventions
- **File naming:** kebab-case for files (`flow-definition.service.ts`); PascalCase for React components (`StepEditorPanel.tsx`).
- **Formatting:** All code must pass the configured ESLint (flat config, `eslint.config.js`) and Prettier rules before committing.
- **Commenting:** Comment the *why*, not the *what*. Use JSDoc for public functions, classes, and complex types — especially in `@allma/core-types` and `@allma/core-sdk`.

### TypeScript & JavaScript
- **ES Modules only** (`import`/`export`); never `require`. Include the `.js` extension on relative imports, per Node ESM:
  ```typescript
  // Correct
  import { AllmaStack } from '../lib/allma-stack.js';
  // Incorrect
  import { AllmaStack } from '../lib/allma-stack';
  ```
- **Typing:** Avoid `any`; prefer `unknown` with narrowing, or specific types from `@allma/core-types`. Use `const` by default, `let` only when reassignment is required, native `enum` for named constant sets, and `readonly` where mutation is not intended.
- **Async:** Use `async/await` (no `.then()`/callbacks). Async functions return `Promise<T>`.
- **Constants:** No magic strings/numbers. Centralize shared constants in `@allma/core-types` (e.g., `ENV_VAR_NAMES`, route constants).

### Architecture & Design Patterns
- **Configuration Management:** Stage config uses a deep-merge pattern. Add new parameters to the default config with a sensible default; put stage-specific overrides (domains, ARNs, capacities) in the corresponding stage config. Never hardcode these in CDK constructs.
- **Generic, Reusable Services:** For repeated data-access patterns (e.g., versioned DynamoDB entities), use/extend generic services (e.g., a `VersionedEntityManager`) before writing new data access from scratch.
- **Middleware for Lambdas:** Encapsulate cross-cutting concerns (auth, logging, feature flags) as higher-order middleware (e.g., `withAdminAuth` from `@allma/core-sdk`).

### AWS CDK (Infrastructure as Code)
- **Composition:** The main stack composes high-level constructs. Group related resources into logical `Construct`s (each in its own file under `lib/constructs/`). Pass dependencies via props; expose created resources as `public readonly`.
- **Resource Naming:** Suffix all resources with the stage (e.g., `AllmaFlowStartRequestQueue-${stageConfig.stage}`) to prevent collisions across environments.
- **Security:** Least privilege always. Define IAM roles within the constructs that use them. Prefer `grant*` methods (e.g., `table.grantReadData(role)`) over hand-written `PolicyStatement`s.

### Lambda Functions (Business Logic)
- **Thin handlers:** Parse input, delegate to service classes/functions, format output. Keep complex logic in testable service files.
- **Observability:** Use the structured JSON logger from `@allma/core-sdk` (never `console.log`). Always include a `correlationId` (e.g., `flowExecutionId`).
- **Error Handling:** Throw `RetryableStepError`/`TransientStepError` for retryable failures; `PermanentStepError`/standard `Error` for permanent ones — leveraging Step Functions retries.
- **Payload Management:** Mind the 256KB Step Functions limit. Use `offloadIfLarge` to store large payloads in S3 and pass pointers; use `hydrateInputFromS3Pointers` to resolve them.

### Data Modeling & Validation
- **Zod contracts:** Define a Zod schema for every structure crossing an application boundary (API, DB items, SFN payloads). Schemas live in `@allma/core-types`. Validate incoming data at the boundary.
- **DynamoDB:** Single-Table Design with composite keys. `PK` identifies the entity (e.g., `FLOW_DEF#<flowId>`); `SK` the item type (e.g., `METADATA`, `VERSION#1`). Encapsulate all access in service classes — no direct `ddbDocClient` calls from handlers.

### Frontend (React — Admin Shell & UI Components)
- **State:** React Query (`@tanstack/react-query`) for server state; Zustand for complex global client state; `useState` for local state.
- **API Layer:** Route all calls through the shared `axiosInstance`; wrap endpoints in custom React Query hooks under `src/api/`.
- **Components:** Organize by feature under `src/features/`; put shared, reusable UI in `@allma/ui-components`.

### General Rules
- When a file has several logical parts, split it for clarity.
- Never duplicate logic. As soon as logic repeats, make it generic and reuse it.

### Lint
- **Always** follow the lint rules in `eslint.config.js` (ESLint 9 flat config).

---

## GitHub Details
- **Repository URL:** `https://github.com/ALLMA-dev/allma-core`
- **Clone URL (HTTPS):** `https://github.com/ALLMA-dev/allma-core.git`
