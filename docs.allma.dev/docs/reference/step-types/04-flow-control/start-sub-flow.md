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

### Execution tree & progress roll-up

A sub-flow runs as its **own execution** with a new `flowExecutionId`, but the platform records
structured linkage so the whole hierarchy is observable from the top-level execution the caller
triggered:

-   Each child carries `rootFlowExecutionId` (the top-level execution), `parentFlowExecutionId`, the
    `parentStepInstanceId` (this `START_SUB_FLOW` step), a `depth` (`0` = root, `>0` = nested), and an
    `executionKind` of `SYNC_SUBFLOW` or `ASYNC_SUBFLOW`.
-   The [`/progress?mode=tree`](../../admin-api/execution-monitoring-api.md#get-execution-progress)
    endpoint returns the root with nested child nodes, each with its own progress bar.
-   Because a **`SYNC`** sub-flow *suspends* its parent, the child also bubbles a one-line summary up
    to the root so a single read reflects the deepest active work. **`ASYNC`** children appear as
    independent nodes in the tree but are not folded into the root's headline (the root may already
    be terminal).
-   Lifecycle [status events](../../execution-status-notifications.md) emitted by a sub-flow carry its
    own `flowExecutionId` and `depth`, with the same `rootFlowExecutionId` — so subscribers can
    attribute them to the triggering execution.

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
