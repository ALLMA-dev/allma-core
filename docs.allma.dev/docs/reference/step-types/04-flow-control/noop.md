---
title: NO_OP
---

# `NO_OP`

### Purpose

A "No Operation" step that performs no action. It simply passes its input directly to its output.

It is useful for several scenarios:
-   **Starting a flow:** A `NO_OP` step is the default "Start" step for all new flows.
-   **Merging branches:** It can serve as a single join point for multiple conditional or parallel paths before proceeding.
-   **Placeholders:** It can be used as a placeholder in a complex flow that you are still designing.

---

### Configuration Parameters

This step has no specific configuration parameters beyond the common step properties.

---

### Input & Output

#### Input

The step's input is constructed from its `inputMappings` and `literals`.

#### Output

The step's output is identical to its input, with an added `message` field.

**Example Output:**
```json
{
  "some_input_data": 123,
  "message": "NO_OP step 'My No-Op Step' executed successfully."
}
```

---

### Full JSON Example

A `NO_OP` step used to merge two conditional branches before continuing to a common final step.

```json
"merge_point": {
  "stepInstanceId": "merge_point",
  "displayName": "Merge Branches",
  "stepType": "NO_OP",
  "defaultNextStepInstanceId": "send_final_notification"
}
```