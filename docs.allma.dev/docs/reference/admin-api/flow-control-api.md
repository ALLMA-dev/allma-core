---
title: Flow Control API
---

# Flow Control API

These endpoints provide powerful debugging and operational control over flow executions, including the "Time Machine" features.

---

### Redrive Flow

`POST /allma/flow-executions/{flowExecutionId}/redrive`

Re-runs a completed or failed execution from the very beginning using the exact same initial input payload. A new `flowExecutionId` is generated for the new run.

-   **Permission:** `DEFINITIONS_WRITE`
-   **Path Parameters:**
    -   `flowExecutionId` (string, required): The ID of the execution to redrive.
-   **Request Body:** Empty.
-   **Success Response:** `200 OK`
    ```json
    {
      "success": true,
      "data": {
        "message": "Flow redrive initiated successfully.",
        "originalFlowExecutionId": "...",
        "newFlowExecutionId": "..."
      }
    }
    ```

---

### Stateful Redrive Flow ("Time Machine")

`POST /allma/flow-executions/{flowExecutionId}/stateful-redrive`

Restarts a failed flow execution from a specific step, optionally with modified context data. This is a powerful debugging tool to test fixes without re-running the entire flow.

-   **Permission:** `DEFINITIONS_WRITE`
-   **Path Parameters:**
    -   `flowExecutionId` (string, required): The ID of the failed execution to restart.
-   **Request Body:** A JSON object with the following properties:
    -   `startFromStepInstanceId` (string, required): The `stepInstanceId` of the step to start from.
    -   `modifiedContextData` (object, optional): A complete JSON object to use as the `currentContextData` when resuming. If omitted, Allma will automatically use the context data as it was just before the target step originally started.
-   **Example Request (restarting with modified data):**
    ```bash
    curl -X POST /allma/flow-executions/{failedExecId}/stateful-redrive \
      -H "Authorization: Bearer <token>" \
      -d '{
        "startFromStepInstanceId": "step_that_failed",
        "modifiedContextData": {
          "steps_output": {
            "previous_step": {
              "corrected_value": "new-valid-data"
            }
          }
        }
      }'
    ```
-   **Success Response:** `200 OK`
    ```json
    {
      "success": true,
      "data": {
        "newFlowExecutionId": "..."
      }
    }
    ```

---

### Sandbox Step Execution

`POST /allma/flows/sandbox/step`

Executes a single step in complete isolation, without triggering a full flow. This is used by the Flow Editor's Sandbox feature for rapid testing and iteration of a step's configuration.

-   **Permission:** `DEFINITIONS_WRITE`
-   **Request Body:** A JSON object with:
    -   `flowDefinitionId` (string, required): The ID of the flow containing the step.
    -   `flowDefinitionVersion` (number, required): The version of the flow.
    -   `stepInstanceId` (string, required): The ID of the step to execute.
    -   `contextData` (object, required): A mock `currentContextData` object to use as the input context for the step's mappings.
-   **Success Response:** `200 OK` with a `StepExecutionResult` object.
    ```json
    // Successful execution
    {
      "success": true,
      "data": {
        "success": true,
        "outputData": {
          "llm_response": "This is the generated summary.",
          "_meta": { ... }
        }
      }
    }

    // Failed execution
    {
      "success": true,
      "data": {
        "success": false,
        "errorInfo": {
          "errorName": "PermanentStepError",
          "errorMessage": "API call failed with status 400"
        }
      }
    }
    ```