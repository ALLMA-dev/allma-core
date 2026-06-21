---
title: Step Statistics API
---

# Step Statistics API

This endpoint returns aggregated, per-step execution statistics for the Admin Panel's **Statistics**
view: how many steps ran (by type and by flow), how that volume is distributed over time, and — for
AI steps — token usage. Counts are derived from terminal step events only (`COMPLETED` + `FAILED`),
so a step that is retried before completing is counted once.

---

### Get Step Statistics

`GET /allma/dashboard/step-stats`

Returns step statistics for the last 24 hours and the last 7 days, plus per-hour and per-day time
series for spotting peaks.

-   **Permission:** `DASHBOARD_VIEW`
-   **Query Parameters:**
    -   `stepType` (string, optional): Restrict all aggregations and the time series to a single step
        type (e.g. `LLM_INVOCATION`, `API_CALL`).
    -   `flowDefinitionId` (string, optional): Restrict all aggregations and the time series to a
        single flow.
-   **Success Response:** `200 OK` with a `StepStatsResponse` object.
    ```json
    {
      "success": true,
      "data": {
        "filterStepType": "LLM_INVOCATION",
        "last24Hours": {
          "totalSteps": 152,
          "byStepType": [
            {
              "stepType": "LLM_INVOCATION",
              "count": 152,
              "failCount": 3,
              "avgDurationMs": 1840.5,
              "inputTokens": 48213,
              "outputTokens": 12044
            }
          ],
          "byFlow": [
            {
              "flowDefinitionId": "flow-abc",
              "count": 120,
              "failCount": 2,
              "byStepType": [
                { "stepType": "LLM_INVOCATION", "count": 120, "failCount": 2, "avgDurationMs": 1900, "inputTokens": 40000, "outputTokens": 10000 }
              ]
            }
          ]
        },
        "last7Days": { "totalSteps": 1043, "byStepType": [ "..." ], "byFlow": [ "..." ] },
        "perHour": [ { "bucketStart": "2026-06-21T09:00:00.000Z", "count": 12 } ],
        "perDay":  [ { "bucketStart": "2026-06-15T00:00:00.000Z", "count": 140 } ]
      }
    }
    ```

#### Response fields

| Field | Description |
| ----- | ----------- |
| `last24Hours` / `last7Days` | Summary for the window: `totalSteps`, a `byStepType` breakdown, and a `byFlow` breakdown (each with its own per-step-type detail). Both arrays are sorted by `count` descending, so the first entries are the "peaks". |
| `byStepType[]` | Per step type: `count`, `failCount`, `avgDurationMs` (averaged over events that recorded a duration), and `inputTokens` / `outputTokens` (populated for AI steps such as `LLM_INVOCATION`; `0` otherwise). |
| `byFlow[]` | Per flow: total `count` / `failCount` plus a nested `byStepType` breakdown. |
| `perHour` | 24 hourly buckets over the last 24h (gap-filled with `0`), scoped to the active filter. |
| `perDay` | 7 daily buckets over the last 7d (gap-filled with `0`), scoped to the active filter. |

-   **Error Responses:**
    -   `403 Forbidden`: The user lacks the `DASHBOARD_VIEW` permission.
    -   `500 Internal Server Error`: An unexpected error occurred while aggregating statistics.

:::note Scale
Statistics are computed on read by scanning the step-execution records in the requested window. This
is simple and requires no extra storage, but read cost grows with execution volume. For very
high-throughput deployments this can be migrated to a write-time rollup counter table behind the same
API contract without any change to clients.
:::
