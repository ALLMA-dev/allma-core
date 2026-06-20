---
title: START_SUB_FLOW
---

# `START_SUB_FLOW`

### Purpose

Starts another Allma Flow as a child (sub-flow), allowing you to build modular, reusable workflows. Unlike [`START_FLOW_EXECUTION`](./start-flow-execution.md) — which is always an asynchronous, "fire-and-forget" operation — `START_SUB_FLOW` supports two execution modes:

-   **`SYNC`** (default): The parent flow **pauses and waits** for the sub-flow to complete. When the sub-flow finishes, its final context is returned as the output of this step and merged back into the parent flow's context.
-   **`ASYNC`**: The parent flow **triggers the sub-flow and immediately continues** to its next step without waiting for the sub-flow to finish.

This step type identifies the target flow via its own `subFlowDefinitionId` field and does **not** use a `moduleIdentifier`.

---

### Configuration Parameters

| Parameter                | Type                             | Required | Description                                                                                                                  |
| ------------------------ | -------------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------- |
| `subFlowDefinitionId`    | `string`                         |   Yes    | The ID of the flow definition to start as a sub-flow.                                                                       |
| `subFlowVersion`         | `string` \| `'LATEST_PUBLISHED'` |    No    | The version of the sub-flow to execute (e.g., `1`). Defaults to `LATEST_PUBLISHED`.                                         |
| `subFlowExecutionMode`   | `'SYNC'` \| `'ASYNC'`            |    No    | `SYNC`: wait for the sub-flow's result and merge it into context. `ASYNC`: trigger and continue. Defaults to `SYNC`.        |
| `inputMappingsToSubFlow` | `object` (Input Mapping)         |    No    | Maps data from the current flow's context to the sub-flow's initial context (`initialContextData`).                         |

> **Note:** This step type does **not** use a `moduleIdentifier` field.

---

### Input & Output

#### Input Mappings

Use `inputMappingsToSubFlow` to build the sub-flow's starting context (`initialContextData`) from the parent flow's context.

**Example:**
```json
"inputMappingsToSubFlow": {
  "initialContextData.order": "$.steps_output.validate_order.validated_data",
  "initialContextData.customerId": "$.flow_variables.customer_id"
}
```

#### Output Schema

The output behavior depends on `subFlowExecutionMode`:

-   In **`ASYNC`** mode, the parent does not wait, so no sub-flow result is merged into context.
-   In **`SYNC`** mode, once the sub-flow completes successfully, the parent receives the sub-flow's **final context data** (`finalContextData`). This resolved object is what gets passed through your `outputMappings`. If no `outputMappings` are defined, the entire sub-flow final context is placed under `$.steps_output.<stepInstanceId>` by default.

If the synchronous sub-flow fails, this step also fails and propagates the sub-flow's error.

The shape of the merged object is the sub-flow's own final context, for example:
```json
{
  "steps_output": {
    "sub_flow_step_a": { "...": "..." },
    "sub_flow_step_b": { "...": "..." }
  },
  "flow_variables": { "...": "..." }
}
```

> **Note:** The exact contents are entirely determined by the sub-flow that runs — the parent simply receives that flow's final context.

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.final_price": "$.steps_output.compute_total.amount"
}
```

---

### Full JSON Example

This example synchronously runs a "Calculate Pricing" sub-flow, passing the current order, waiting for it to finish, and mapping its computed total back into the parent flow's variables.

```json
"run_pricing_subflow": {
  "stepInstanceId": "run_pricing_subflow",
  "displayName": "Run Pricing Sub-Flow",
  "stepType": "START_SUB_FLOW",
  "subFlowDefinitionId": "calculate-pricing-flow",
  "subFlowVersion": "LATEST_PUBLISHED",
  "subFlowExecutionMode": "SYNC",
  "inputMappingsToSubFlow": {
    "initialContextData.order": "$.steps_output.validate_order.validated_data",
    "initialContextData.customerId": "$.flow_variables.customer_id"
  },
  "outputMappings": {
    "$.flow_variables.final_price": "$.steps_output.compute_total.amount"
  },
  "defaultNextStepInstanceId": "next_step_in_parent"
}
```
