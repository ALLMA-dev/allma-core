---
title: END_FLOW
---

# `END_FLOW`

### Purpose

Immediately terminates the current execution path.

-   If this step is in the main path of a flow, the entire flow execution stops and enters the `finalize-flow` phase, resulting in a `COMPLETED` status.
-   If this step is inside a parallel branch, only that specific branch terminates. Other parallel branches will continue to run.

It is a terminal step and has no `defaultNextStepInstanceId` or `transitions`.

---

### Configuration Parameters

This step has no specific configuration parameters beyond the common step properties.

---

### Input & Output

This step does not process any input and produces no output. Any mappings defined on it will be ignored.

---

### Full JSON Example

This step is often used as the target of a conditional transition or as the end of a fallback path.

```json
"handle_success": {
  "stepInstanceId": "handle_success",
  "displayName": "End Flow Gracefully",
  "stepType": "END_FLOW"
}
```