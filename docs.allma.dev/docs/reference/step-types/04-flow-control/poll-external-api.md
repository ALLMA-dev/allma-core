---
title: POLL_EXTERNAL_API
---

# `POLL_EXTERNAL_API`

### Purpose

Pauses the flow and repeatedly calls an API endpoint until a specific success or failure condition in the API's response is met. This is ideal for checking the status of a long-running job initiated in another system.

---

### Configuration Parameters

| Parameter           | Type     | Required | Description                                                                                                                            |
| ------------------- | -------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apiCallDefinition` | `object` |   Yes    | Defines the API endpoint to call, including `apiUrlTemplate`, `apiHttpMethod`, headers, and body. This has the same structure as an `API_CALL` step. |
| `pollingConfig`     | `object` |   Yes    | Configures the polling timing: `intervalSeconds` (wait time between calls) and `maxAttempts`.                                          |
| `exitConditions`    | `object` |   Yes    | Defines when the polling should stop. These are JSONPath expressions evaluated against the **API response body**.                       |

#### The `exitConditions` Object

| Property           | Type     | Required | Description                                                                                  |
| ------------------ | -------- | :------: | -------------------------------------------------------------------------------------------- |
| `successCondition` | `string` |   Yes    | If this JSONPath resolves to a truthy value, the step succeeds.                              |
| `failureCondition` | `string` |   Yes    | If this JSONPath resolves to a truthy value (and the success condition is not met), the step fails. |

---

### Input & Output

#### Input Mappings

The step uses `inputMappings` to provide variables for the templates within its `apiCallDefinition`, just like a standard `API_CALL` step.

#### Output Schema

The output of a successful `POLL_EXTERNAL_API` step is the **full response object** (`{ status, headers, data }`) from the **final, successful** API call.

**Output Mapping Example:**
To save the final job result from the API response data:
```json
"outputMappings": {
  "$.steps_output.final_job_result": "$.data"
}
```

---

### Full JSON Example

This example polls a job status endpoint every 10 seconds. It succeeds if `status` is "COMPLETED" and fails if it's "FAILED".

```json
"wait_for_job_completion": {
  "stepInstanceId": "wait_for_job_completion",
  "displayName": "Wait for Video Processing Job",
  "stepType": "POLL_EXTERNAL_API",
  "apiCallDefinition": {
    "apiHttpMethod": "GET",
    "apiUrlTemplate": {
      "template": "https://api.media.com/jobs/{{job_id}}",
      "contextMappings": {
        "job_id": { "sourceJsonPath": "$.steps_output.start_job.jobId" }
      }
    }
  },
  "pollingConfig": {
    "intervalSeconds": 10,
    "maxAttempts": 30
  },
  "exitConditions": {
    "successCondition": "$.status == 'COMPLETED'",
    "failureCondition": "$.status == 'FAILED' || $.status == 'CANCELLED'"
  },
  "outputMappings": {
    "$.steps_output.processed_video_details": "$.data"
  },
  "defaultNextStepInstanceId": "notify_user"
}