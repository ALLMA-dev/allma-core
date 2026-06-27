---
title: Flow Definition Reference
sidebar_position: 1
---

# Flow Definition Reference

The `FlowDefinition` is the core JSON object that declaratively defines an entire workflow in Allma. This document provides an exhaustive reference for every property in its structure.

### Full Structure Example

```json
{
  "id": "string",
  "version": "number",
  "isPublished": "boolean",
  "name": "string",
  "description": "string (optional)",
  "tags": ["string"],
  "startStepInstanceId": "string",
  "enableExecutionLogs": "boolean",
  "onCompletionActions": [
    {
      "actionType": "API_CALL | SNS_SEND | ...",
      "target": "string",
      "executeOnStatus": "COMPLETED | FAILED | ANY",
      "...": "..."
    }
  ],
  "steps": {
    "step_instance_id_1": {
      "stepInstanceId": "string",
      "stepType": "LLM_INVOCATION | API_CALL | ...",
      "displayName": "string (optional)",
      "checkpoint": { "id": "string", "label": "string", "order": "number (optional)" },
      "stepDefinitionId": "string (optional)",
      "inputMappings": { "target.path": "$.source.json.path" },
      "outputMappings": { "$.target.json.path": "$.source.path" },
      "literals": { "target.path": "static value" },
      "transitions": [
        {
          "condition": "$.json.path.to.evaluate",
          "nextStepInstanceId": "string"
        }
      ],
      "defaultNextStepInstanceId": "string (optional)",
      "onError": {
        "retries": { "...": "..." },
        "retryOnContentError": { "...": "..." },
        "fallbackStepInstanceId": "string"
      },
      "...": "step-specific properties"
    }
  }
}
```

---

## Top-Level Properties

| Property                | Type                      | Required | Description                                                                                                                              |
| ----------------------- | ------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | `string`                  |   Yes    | The unique identifier (UUID) for the flow definition. All versions of a flow share the same `id`.                                        |
| `version`               | `number`                  |   Yes    | The integer version number for this specific definition.                                                                                 |
| `isPublished`           | `boolean`                 |   Yes    | If `true`, this is the "live" version of the flow that will be executed by default.                                                      |
| `name`                  | `string`                  |   Yes    | A human-readable name for the flow.                                                                                                      |
| `description`           | `string`                  |    No    | A detailed description of what the flow does.                                                                                            |
| `tags`                  | `string[]`                |    No    | An array of strings for organizing and filtering flows.                                                                                  |
| `startStepInstanceId`   | `string`                  |   Yes    | The `stepInstanceId` of the first step to be executed when the flow is triggered.                                                        |
| `enableExecutionLogs`   | `boolean`                 |    No    | If `true`, detailed step-by-step logs will be written to the execution log table. Can be overridden at trigger time. Defaults to `false`. |
| `onCompletionActions`   | `OnCompletionAction[]`    |    No    | An array of actions to perform after the flow finishes (either `COMPLETED` or `FAILED`).                                                 |
| `steps`                 | `Record<string, object>`  |   Yes    | A dictionary object where each key is a unique `stepInstanceId` and the value is a **Step Instance** configuration object.               |

---

## The Step Instance Object

Each key in the top-level `steps` object is a unique identifier for a step within this flow (the `stepInstanceId`). The value is an object detailing that step's configuration.

### Common Step Properties

These properties are available on almost every step type.

| Property                    | Type                   | Required | Description                                                                                                                                        |
| --------------------------- | ---------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stepInstanceId`            | `string`               |   Yes    | The unique identifier for this step within the flow. Must match its key in the `steps` object.                                                     |
| `stepType`                  | `string`               |   Yes    | The type of work this step performs (e.g., `LLM_INVOCATION`, `API_CALL`, `PARALLEL_FORK_MANAGER`). This determines which other properties are valid. |
| `displayName`               | `string`               |    No    | A human-readable name for this step instance, shown in the UI.                                                                                     |
| `checkpoint`                | `object`               |    No    | Marks this step as a **progress milestone**. When a flow declares any checkpoints, live execution-progress views measure progress against them instead of raw step counts. See [The `checkpoint` Object](#the-checkpoint-object).                  |
| `stepDefinitionId`          | `string`               |    No    | The ID of a reusable `StepDefinition`. If provided, this step inherits its properties, which can be overridden by properties in this instance.        |
| `inputMappings`             | `Record<string, string>` |    No    | Defines how data from the Flow Context is mapped to this step's input. Keys are target paths, values are source JSONPaths.                        |
| `outputMappings`            | `Record<string, string>` |    No    | Defines how data from this step's output is merged back into the Flow Context. Keys are target JSONPaths, values are source JSONPaths.            |
| `literals`                  | `Record<string, any>`  |    No    | Provides static, hard-coded values to the step's input. Merged with `inputMappings`.                                                               |
| `transitions`               | `Transition[]`         |    No    | An array of conditional transitions. The first condition that evaluates to `true` determines the next step.                                        |
| `defaultNextStepInstanceId` | `string`               |    No    | The next step to execute if no `transitions` are met. Required if the step is not a terminal step (like `END_FLOW`).                              |
| `onError`                   | `object`               |    No    | Configures retry and fallback behavior. See details below.                                                                                         |

### The `onError` Object

| Property                 | Type      | Description                                                                                                                                        |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `retries`                | `object`  | Configures retries for transient errors (e.g., network issues). Contains `count`, `intervalSeconds`, `backoffRate`.                                  |
| `retryOnContentError`    | `object`  | Configures fast, internal retries for content errors (e.g., malformed JSON from an LLM). Contains `count`.                                          |
| `fallbackStepInstanceId` | `string`  | The `stepInstanceId` to jump to if the step fails permanently after all retries. The flow continues instead of failing.                              |
| `continueOnFailure`      | `boolean` | If `true`, ignores the error and proceeds to the `defaultNextStepInstanceId`. The step's output will be empty. **Use with caution.**                  |

### The `checkpoint` Object

A `checkpoint` tags a step as a **meaningful milestone** so that live progress reflects business stages (e.g. "Extracting documents") instead of every micro-step. The checkpoint travels *with* the step, so the set of checkpoints — and therefore the progress denominator — is derived from the flow definition automatically; there is no separate list to keep in sync when you add, remove, reorder, or clone steps.

| Property | Type     | Required | Description                                                                                                                            |
| -------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | `string` |   Yes    | Stable identifier for this milestone. Clients map it to their own status text, so keep it stable across edits.                          |
| `label`  | `string` |   Yes    | Human-readable milestone shown in progress views.                                                                                       |
| `order`  | `number` |    No    | Non-negative integer used for **monotonic** progress and a stable "stage N of M" label. Re-entering an earlier step never moves the bar backward. |

**How progress is derived:**

- If a flow declares **no** checkpoints, progress is the **step count** (`completedStepCount / totalStepCount`) — honest but noisy (a 5 ms step advances it as much as a 5 min step).
- If a flow declares **one or more** checkpoints, progress is measured against those milestones, and `progressPercent` / `currentCheckpoint` reflect the milestone reached. This is the readable experience — tag a handful of steps on the common path.
- Progress is **monotonic** (tracks the highest `order` reached, so loops don't rewind the bar) and is **clamped to 100%** on terminal `COMPLETED`, even if the run never hit the highest-ordered checkpoint.
- Place checkpoints on the **common path**: conditional branches that skip a checkpoint simply jump the bar forward, which is author-controlled and acceptable.

**Example — tagging a step as a checkpoint:**

```json
"extract_documents": {
  "stepInstanceId": "extract_documents",
  "stepType": "LLM_INVOCATION",
  "displayName": "Extract Documents",
  "checkpoint": { "id": "extract", "label": "Extracting documents", "order": 2 },
  "defaultNextStepInstanceId": "next_step"
}
```

Checkpoints feed the [Execution Monitoring `/progress` endpoint](./admin-api/execution-monitoring-api.md#get-execution-progress) and the [`CHECKPOINT` lifecycle events](./execution-status-notifications.md) delivered to the application that triggered the flow.

### The `onCompletionActions` Array

This array allows you to trigger side effects when a flow finishes. Each object in the array has the following properties:

| Property                    | Type       | Description                                                                                                                                                             |
| --------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actionType`                | `string`   | The type of action: `API_CALL`, `SNS_SEND`, `CUSTOM_LAMBDA_INVOKE`, `LOG_ONLY`.                                                                                           |
| `target`                    | `string`   | The destination for the action (e.g., API URL, SNS Topic ARN, Lambda ARN).                                                                                              |
| `executeOnStatus`           | `string`   | When to run this action: `COMPLETED`, `FAILED`, or `ANY` (default).                                                                                                     |
| `condition`                 | `string`   | A JSONPath expression evaluated against the final flow context. The action only runs if the result is truthy.                                                           |
| `payloadTemplate`           | `object`   | A mapping to build the JSON payload for the action. Keys are payload field names, values are JSONPaths from the final flow context.                                       |
| `apiHttpMethod`             | `string`   | (For `API_CALL` only) The HTTP method, e.g., `POST`.                                                                                                                    |
| `messageAttributesTemplate` | `object`   | (For `SNS_SEND` only) A mapping to build SNS message attributes. Keys are attribute names, values are JSONPaths.                                                        |