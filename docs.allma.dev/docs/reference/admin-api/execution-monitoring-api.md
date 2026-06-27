---
title: Execution Monitoring API
---

# Execution Monitoring API

These endpoints are used to query and retrieve details about historical and in-progress flow executions.

---

### List Executions

`GET /allma/flow-executions`

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

`GET /allma/flow-executions/{flowExecutionId}`

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

### Get Execution Progress

`GET /allma/flow-executions/{flowExecutionId}/progress`

Returns a compact, **lag-free** progress snapshot for a single execution — the current step, the
checkpoint reached, and a `progressPercent` — suitable for polling a progress bar while a flow runs.
This reads a single metadata item stamped by the orchestrator at each step boundary, so it is far
cheaper than fetching the full step log on every poll. Stop polling as soon as `status` is terminal.

-   **Permission:** `EXECUTIONS_READ`
-   **Path Parameters:**
    -   `flowExecutionId` (string, required): The ID of the (root) execution to inspect.
-   **Query Parameters:**
    -   `mode` (string, optional): `tree` (default) or `single`.
        -   `single`: returns just this execution node (its `children` array is empty). Cheapest; for a compact status widget.
        -   `tree`: also assembles nested **sub-flow and parallel-branch** nodes (see [Execution tree](../execution-status-notifications.md)), each with its own progress, under `root.children`.
-   **Success Response:** `200 OK` with an `ExecutionProgressResponse`.
    ```jsonc
    {
      "root": {
        "flowExecutionId": "R-uuid",
        "flowDefinitionId": "invoice-flow",
        "flowDefinitionVersion": 7,
        "executionKind": "ROOT",            // ROOT | SYNC_SUBFLOW | ASYNC_SUBFLOW | PARALLEL_BRANCH
        "depth": 0,                          // 0 = root, >0 = sub-flow / branch
        "parentStepInstanceId": null,        // the parent step that launched a sub-flow/branch
        "status": "RUNNING",
        "isWaiting": false,                  // true for a paused WAIT_FOR_EXTERNAL_EVENT / POLL_EXTERNAL_API step
        "currentStep": { "stepInstanceId": "extract_documents", "displayName": "Extract Documents", "stepType": "LLM_INVOCATION" },
        "currentCheckpoint": { "id": "extract", "label": "Extracting documents", "order": 2, "ordinal": 3 },
        "completedStepCount": 4,
        "totalStepCount": 9,
        "totalCheckpoints": 4,
        "progressPercent": 66,
        "startTime": "2026-06-26T10:15:00.000Z",
        "endTime": null,
        "children": [ /* nested ExecutionProgressNode[] when mode=tree */ ]
      },
      "headline": {                          // one-line summary of the deepest active work
        "executionId": "C-uuid",
        "label": "Extracting documents",
        "percent": 66,
        "status": "RUNNING",
        "isWaiting": false
      }
    }
    ```

:::note Progress layers
When the flow tags steps with [`checkpoint`](../flow-definition-reference.md#the-checkpoint-object),
`progressPercent` and `currentCheckpoint` track those milestones (L2). Otherwise progress is the raw
`completedStepCount / totalStepCount` (L1). Use `headline` to render a single status line without
walking the tree yourself.
:::

---

### Get Parallel Branch Steps

`GET /allma/flow-executions/{flowExecutionId}/branch-steps`

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