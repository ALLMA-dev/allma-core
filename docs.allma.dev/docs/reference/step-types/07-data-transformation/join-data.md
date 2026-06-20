---
title: join-data
---

# `system/join-data`

### Purpose

A data transformation module that joins two datasets together on one or more matching key columns, similar to a SQL `JOIN`. Each dataset can be supplied as either a JSON array of objects or a raw CSV string, and the joined result can be emitted as either a JSON array or a CSV string. It supports `inner`, `left`, `right`, and `outer` join types, key columns that share the same name in both datasets, and key columns whose names differ between the two datasets.

---

### Configuration Parameters

This module reads its configuration from a single combined input object. Each parameter may be supplied either through **Input Mappings** (resolved from flow data) or through the step's **`customConfig`** (static values, which support template strings). When a parameter is present in both, the value coming from Input Mappings takes precedence.

In practice, the large datasets (`left_source`, `right_source`) are typically supplied via Input Mappings, while the static settings (`join_type`, `join_keys`, formats, etc.) are placed in `customConfig`.

| Parameter              | Type                                  | Required | Description                                                                                                                                                              |
| ---------------------- | ------------------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `left_source`          | `array` \| `string`                   |   Yes    | The first (left) dataset. Must be a JSON array of objects when `left_format` is `json`, or a raw CSV string when `left_format` is `csv`.                                  |
| `left_format`          | `"csv"` \| `"json"`                   |   Yes    | The format of `left_source`.                                                                                                                                            |
| `right_source`         | `array` \| `string`                   |   Yes    | The second (right) dataset. Must be a JSON array of objects when `right_format` is `json`, or a raw CSV string when `right_format` is `csv`.                              |
| `right_format`         | `"csv"` \| `"json"`                   |   Yes    | The format of `right_source`.                                                                                                                                           |
| `join_type`            | `"inner"` \| `"left"` \| `"right"` \| `"outer"` | Yes | The type of join to perform.                                                                                                                                            |
| `join_keys`            | `string[]`                            |  Cond.   | For simple joins. An array of column names that are **identical** in both datasets (e.g. `["user_id"]`). Provide **either** this **or** `key_mappings`, but not both.    |
| `key_mappings`         | `{ left: string; right: string }[]`   |  Cond.   | For advanced joins. An array of `{ left, right }` objects mapping columns with **different** names (e.g. `[{ "left": "manager_id", "right": "id" }]`). Provide **either** this **or** `join_keys`, but not both. |
| `right_select_columns` | `string[]` \| `null`                  |    No    | Optional list of column names from the right dataset to include in the output. If omitted or `null`, all non-key columns from the right dataset are included.            |
| `output_format`        | `"csv"` \| `"json"`                   |   Yes    | The format of the joined result.                                                                                                                                       |

> **Note on keys:** Exactly one of `join_keys` or `key_mappings` must be provided. Supplying both, or neither, is a validation error. When `join_keys` is used it is internally expanded to a `{ left, right }` mapping where the left and right key names are the same.

> **Validation:** The data type of each source must match its declared format (`json` → array, `csv` → string). All declared join key columns must exist in their respective datasets, otherwise the step fails with a permanent error.

---

### Behavior Details

- **Composite keys:** When multiple keys are provided, rows match only when **all** key values are equal. Internally a composite key is formed by joining the key values with `" | "`.
- **Key column naming in output:** Key columns appear under the **left-side** key name. For unmatched right rows (in `right`/`outer` joins), the key columns are populated from the right row's values but still labeled with the left-side key name.
- **Column collisions:** When the left and right datasets share a non-key column of the same name, the colliding columns are disambiguated by appending `_left` and `_right` suffixes (e.g. `name_left`, `name_right`).
- **Unmatched rows:**
  - `inner` — only rows with a match on both sides.
  - `left` — all left rows; unmatched right-side columns are set to `null`.
  - `right` — all right rows; unmatched left-side columns are set to `null`.
  - `outer` — all rows from both sides; missing columns on either side are set to `null`.
- **One-to-many:** If a left key matches multiple right rows, one output row is produced per match (rows are multiplied).
- **Empty inputs:** If the left dataset is empty for an `inner` or `left` join, or the right dataset is empty for an `inner` or `right` join, the step short-circuits and returns an empty result (`[]` for JSON, `""` for CSV) with `rowCount: 0`.

---

### Input & Output

#### Input Mappings

Supply the datasets (and optionally any other parameter) from flow data. For example, mapping two arrays produced by earlier steps:

```json
"inputMappings": {
  "left_source": "$.steps_output.employees",
  "right_source": "$.steps_output.departments"
}
```

#### `customConfig`

Place the static join settings in `customConfig`. These values support template strings:

```json
"customConfig": {
  "left_format": "json",
  "right_format": "json",
  "join_keys": ["department_id"],
  "join_type": "left",
  "output_format": "json"
}
```

#### Output Schema

The output is an object containing the joined `result` (an array when `output_format` is `json`, or a CSV string when `output_format` is `csv`) and a `rowCount`.

```json
{
  "result": [
    {
      "department_id": "d1",
      "employee_name": "Alice",
      "department_name": "Engineering"
    },
    {
      "department_id": "d2",
      "employee_name": "Bob",
      "department_name": "Sales"
    }
  ],
  "rowCount": 2
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.steps_output.joined_records": "$.result",
  "$.flow_variables.joined_row_count": "$.rowCount"
}
```

---

### Full JSON Example

This step performs a `left` join between an `employees` array and a `departments` array on the shared `department_id` column, keeping every employee even if no matching department exists. The datasets are provided via Input Mappings, while the static join settings live in `customConfig`.

```json
"join_employees_departments": {
  "stepInstanceId": "join_employees_departments",
  "displayName": "Join Employees with Departments",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/join-data",
  "inputMappings": {
    "left_source": "$.steps_output.employees",
    "right_source": "$.steps_output.departments"
  },
  "customConfig": {
    "left_format": "json",
    "right_format": "json",
    "join_keys": ["department_id"],
    "join_type": "left",
    "right_select_columns": ["department_name"],
    "output_format": "json"
  },
  "outputMappings": {
    "$.steps_output.joined_records": "$.result",
    "$.flow_variables.joined_row_count": "$.rowCount"
  },
  "defaultNextStepInstanceId": "next_step"
}
```
