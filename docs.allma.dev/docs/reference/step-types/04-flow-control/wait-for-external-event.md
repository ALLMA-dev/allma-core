---
title: WAIT_FOR_EXTERNAL_EVENT
---

# `WAIT_FOR_EXTERNAL_EVENT`

### Purpose

Pauses the flow execution indefinitely until an external system resumes it by calling the secure Allma **Resume API**. This is essential for human-in-the-loop workflows (e.g., approvals) or waiting for long-running asynchronous jobs in other systems.

---

### Configuration Parameters

| Parameter              | Type     | Required | Description                                                                                                                                                               |
| ---------------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `correlationKeyTemplate` | `string` |   Yes    | A Handlebars template string that generates a unique business key for this specific wait state (e.g., `user-response:{{flow_variables.userId}}`). The Resume API uses this key to find the correct paused flow. |
| `maxWaitTimeSeconds`   | `number` |    No    | The maximum time (in seconds) the flow will wait for the resume event before timing out and failing. Defaults to 604800 (7 days).                                            |

---

### Input & Output

#### Input Mappings

This step does not typically require `inputMappings`, as its configuration is self-contained. The `correlationKeyTemplate` has access to the entire flow context for rendering.

#### Output Schema

The output of this step is the JSON `payload` that was sent to the **Resume API**.

**Example:**
If the Resume API is called with this body:
```json
{
  "correlationValue": "expense-approval:EXP-123",
  "payload": {
    "decision": "APPROVED",
    "approvedBy": "manager@example.com"
  }
}
```
The output of the `WAIT_FOR_EXTERNAL_EVENT` step will be:
```json
{
  "decision": "APPROVED",
  "approvedBy": "manager@example.com"
}
```

**Output Mapping Example:**
To store the decision from the payload into the flow context:
```json
"outputMappings": {
  "$.flow_variables.approval_status": "$.decision"
}
```

---

### Full JSON Example

This example pauses a workflow to wait for an expense approval. It sets a timeout of 1 day and uses a conditional transition to route the flow based on the decision received from the Resume API.

```json
"wait_for_approval": {
  "stepInstanceId": "wait_for_approval",
  "displayName": "Wait for Manager Approval",
  "stepType": "WAIT_FOR_EXTERNAL_EVENT",
  "correlationKeyTemplate": "expense-approval:{{initialContextData.expenseId}}",
  "maxWaitTimeSeconds": 86400,
  "outputMappings": {
    "$.flow_variables.approval_result": "$"
  },
  "transitions": [
    {
      "condition": "$.flow_variables.approval_result.decision == 'APPROVED'",
      "nextStepInstanceId": "process_payment"
    }
  ],
  "defaultNextStepInstanceId": "notify_rejection"
}
```