---
title: Execution Monitoring API
---

# Execution Monitoring API

These endpoints are used to query and retrieve details about historical and in-progress flow executions.

---

### List Executions

`GET /flow-executions`

Retrieves a paginated list of execution summaries for a specific flow definition.

-   **Permission:** `EXECUTIONS_READ`
-   **Query Parameters:**
    -   `flowDefinitionId` (string, required): The ID of the flow to list executions for.
    -   `flowVersion` (string, optional): Filter executions for a specific version number.
    -   `status` (string, optional): Filter by status (e.g., `COMPLETED`, `FAILED`, `RUNNING`).
    -   `limit` (number, optional): The number of items to return per page (default: 50).
    -   `nextToken` (string, optional): A pagination token from a previous response to fetch the next page.
-   **Success Response:** `200 OK` with a paginated response object.
    ```json
    {
      "success": true,
      "data": {
        "items": [
          {
            "flowExecutionId": "...",
            "status": "COMPLETED",
            "startTime": "...",
            "endTime": "...",
            "durationMs": 1234
          }
        ],
        "nextToken": "ey...base64...token"
      }
    }
    ```

---

### Get Execution Details

`GET /flow-executions/{flowExecutionId}`

Retrieves the complete, detailed step-by-step log for a single flow execution.

-   **Permission:** `EXECUTIONS_READ`
-   **Path Parameters:**
    -   `flowExecutionId` (string, required): The ID of the execution to retrieve.
-   **Success Response:** `200 OK` with a `FlowExecutionDetails` object.
    ```json
    {
      "success": true,
      "data": {
        "metadata": { ... }, // The main execution record
        "steps": [ ... ], // An array of detailed step execution records
        "resolvedFinalContextData": { ... } // The full context at the end of the flow
      }
    }
    ```

---

### Get Parallel Branch Steps

`GET /flow-executions/{flowExecutionId}/branch-steps`

For a parallel execution, this retrieves the step logs for the child branches.

-   **Permission:** `EXECUTIONS_READ`
-   **Path Parameters:**
    -   `flowExecutionId` (string, required): The ID of the parent execution.
-   **Query Parameters:**
    -   `parentStepInstanceId` (string, required): The `stepInstanceId` of the `PARALLEL_FORK_MANAGER` step.
    -   `parentStepStartTime` (string, required): The ISO 8601 start time of the `PARALLEL_FORK_MANAGER` step.
-   **Success Response:** `200 OK`. The response is an object where keys are unique branch execution IDs and values are arrays of step records for that branch.
    ```json
    {
      "success": true,
      "data": {
        "branch-exec-1": {
          "branchId": "process_item",
          "steps": [ ... ]
        },
        "branch-exec-2": {
          "branchId": "process_item",
          "steps": [ ... ]
        }
      }
    }
    ```