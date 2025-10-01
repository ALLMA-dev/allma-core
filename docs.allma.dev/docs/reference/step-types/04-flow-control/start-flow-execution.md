---
title: START_FLOW_EXECUTION
---

# `START_FLOW_EXECUTION`

### Purpose

Triggers a new, completely independent Allma flow execution. This is an asynchronous, "fire-and-forget" operation. The current flow does not wait for the new flow to complete and continues immediately to its next step.

---

### Configuration Parameters

| Parameter          | Type     | Required | Description                                                                                                                                                         |
| ------------------ | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moduleIdentifier` | `string` |   Yes    | Must be set to `system/start-flow-execution`.                                                                                                                      |

#### Building the Input

The configuration for this step is built by combining `inputMappings` and `literals`. The final combined input object **must** conform to the `StartFlowExecutionInput` schema, which requires:
-   `flowDefinitionId` (string): The ID of the flow to trigger.
-   `flowVersion` (string): The version to trigger (e.g., `1`, `LATEST_PUBLISHED`).
-   `initialContextData` (object): The JSON object to use as the new flow's starting context.

---

### Input & Output

#### Input Mappings

Use `inputMappings` to construct the payload for the new flow.

**Example:**
```json
"inputMappings": {
  "flowDefinitionId": "$.flow_variables.process_order_flow_id",
  "initialContextData.order": "$.steps_output.validate_order.validated_data"
}
```

#### Literals

Use `literals` for static configuration.

**Example:**
```json
"literals": {
  "flowVersion": "LATEST_PUBLISHED",
  "enableExecutionLogs": true
}
```

#### Output Schema

The step's output contains the unique ID of the newly triggered flow.
```json
{
  "sqsMessageId": "...",
  "startedFlowExecutionId": "uuid-of-the-new-flow-execution",
  "_meta": { "status": "SUCCESS" }
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.child_flow_id": "$.startedFlowExecutionId"
}
```

---

### Full JSON Example

This example triggers a separate "Process Order" flow, passing the current order details as its initial context.

```json
"trigger_order_processing": {
  "stepInstanceId": "trigger_order_processing",
  "displayName": "Trigger Order Processing Flow",
  "stepType": "START_FLOW_EXECUTION",
  "moduleIdentifier": "system/start-flow-execution",
  "literals": {
    "flowDefinitionId": "process-order-flow",
    "flowVersion": "LATEST_PUBLISHED"
  },
  "inputMappings": {
    "initialContextData.orderDetails": "$.currentItem"
  },
  "outputMappings": {
    "$.flow_variables.triggered_order_flow_id": "$.startedFlowExecutionId"
  },
  "defaultNextStepInstanceId": "next_step_in_parent"
}
```