---
title: PARALLEL_FORK_MANAGER
---

# `PARALLEL_FORK_MANAGER`

### Purpose

Executes one or more branches of logic concurrently for each item in a collection. This is the cornerstone of parallel processing in Allma and supports two powerful modes: **In-Memory Map** and **S3 Distributed Map**.

---

### Configuration Parameters

| Parameter           | Type       | Required | Description                                                                                                                                                                                                                                  |
| ------------------- | ---------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `itemsPath`         | `string`   |   Yes    | A **JSONPath** expression pointing to the data to be processed. If it points to an array in the context, it runs in **In-Memory** mode. If it points to an **S3 Pointer object**, it runs in **S3 Distributed Map** mode.                     |
| `parallelBranches`  | `object[]` |   Yes    | An array of branch definitions. For each item from `itemsPath`, the first branch whose `condition` is met will be executed.                                                                                                                  |
| `aggregationConfig` | `object`   |    No    | Configures how the results from all branches are combined. See the `aggregationConfig` object details below.                                                                                                                                 |

#### The `parallelBranches` Object

| Property         | Type     | Required | Description                                                                                                                                |
| ---------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `branchId`       | `string` |   Yes    | A unique identifier for this branch definition.                                                                                            |
| `stepInstanceId` | `string` |   Yes    | The `stepInstanceId` of the first step to execute within this branch. The branch will then follow the transitions defined in its own steps. |
| `condition`      | `string` |    No    | A JSONPath expression evaluated against the context (including `$.currentItem`). If truthy, this branch is chosen for the item.            |

#### The `aggregationConfig` Object

| Property            | Type     | Description                                                                                                                                            |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `strategy`          | `string` | How to combine results: `COLLECT_ARRAY` (default), `MERGE_OBJECTS`, or `SUM`.                                                                          |
| `dataPath`          | `string` | A JSONPath to extract a specific piece of data from each branch's output before aggregating. Recommended to prevent state bloat.                       |
| `failOnBranchError` | `boolean`| If `true` (default), the entire parallel step fails if any single branch fails.                                                                        |
| `maxConcurrency`    | `number` | (In-Memory mode only) Limits how many branches run at the same time. `0` means no limit.                                                               |

---

### Input & Output

#### Input Mappings

This step does not use `inputMappings`. All configuration is self-contained. The data to be processed is specified by `itemsPath`.

#### Output Schema

The output of the step (before output mapping) is an object containing the aggregated results:

```json
{
  "aggregatedData": [ ... ] // or { ... } or number, depending on strategy
}
```

**Output Mapping Example:**
To store the array of collected results into the flow context:
```json
"outputMappings": {
  "$.steps_output.processed_items": "$.aggregatedData"
}
```

---

### Full JSON Example

This example processes an array of user objects. For each user, it calls an API to enrich their profile. The results are collected into an array.

```json
"enrich_users_in_parallel": {
  "stepInstanceId": "enrich_users_in_parallel",
  "displayName": "Enrich Users in Parallel",
  "stepType": "PARALLEL_FORK_MANAGER",
  "itemsPath": "$.steps_output.get_users.user_list",
  "parallelBranches": [
    {
      "branchId": "enrich_branch",
      "stepInstanceId": "call_enrichment_api"
    }
  ],
  "aggregationConfig": {
    "strategy": "COLLECT_ARRAY",
    "dataPath": "$.steps_output.format_enrichment.enriched_user_data"
  },
  "outputMappings": {
    "$.steps_output.enriched_users": "$.aggregatedData"
  },
  "defaultNextStepInstanceId": "finalize_report"
}
```