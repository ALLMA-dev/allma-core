# @allma/core-types

[![npm version](https://img.shields.io/npm/v/%40allma%2Fcore-types)](https://www.npmjs.com/package/@allma/core-types)
[![License](https://img.shields.io/npm/l/%40allma%2Fcore-types)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package is the single source of truth for data contracts within the Allma ecosystem. It provides shared TypeScript types, interfaces, enums, constants, and Zod schemas used across all Allma packages and integration modules.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Installation

```bash
npm install @allma/core-types
```

## Core Usage

Use this package to ensure type safety and runtime validation when interacting with Allma's data structures, such as when building custom step modules or plugins.

**Example: Using a Flow Definition Type and a Zod Schema**

```typescript
import { FlowDefinition, FlowDefinitionSchema, StepType } from '@allma/core-types';
import { z } from 'zod';

// Use interfaces for function signatures to ensure type safety
function analyzeFlow(flow: FlowDefinition): number {
  console.log(`Analyzing flow: ${flow.name}`);
  return flow.steps.length;
}

// Use Zod schemas for runtime validation of raw input
function validateAndProcessFlow(rawInput: unknown): void {
  const validationResult = FlowDefinitionSchema.safeParse(rawInput);

  if (!validationResult.success) {
    console.error('Invalid flow definition:', validationResult.error.flatten());
    throw new Error('Validation failed');
  }

  // `validationResult.data` is now fully typed as `FlowDefinition`
  const stepCount = analyzeFlow(validationResult.data);
  console.log(`The flow has ${stepCount} steps.`);
}
```

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.