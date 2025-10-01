---
title: flatten-array
---

# `system/flatten-array`

### Purpose

A data transformation module that flattens a nested array or extracts properties from an array of objects into a new, flat array.

---

### Configuration Parameters (via Input Mappings)

| Parameter | Type     | Required | Description                                                                                                                                                                                                                                    |
| --------- | -------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `array`   | `array`  |   Yes    | The array to be processed.                                                                                                                                                                                                                     |
| `path`    | `string` |    No    | If provided, this is the property name (a simple key, not JSONPath) to extract from each object in the `array`. If the extracted value is an array, its elements are flattened into the result. If it's a single value, it's added directly. |

---

### Input & Output

#### Input Mappings

Use `inputMappings` to provide the array and optional path.

**Example 1: Simple Flatten**
-   Input Array: `[[1, 2], [3], [4, 5]]`
-   Mappings: `{"array": "$.my_nested_array"}`
-   Result: `[1, 2, 3, 4, 5]`

**Example 2: Extracting Properties**
-   Input Array: `[{"tags": ["a", "b"]}, {"tags": ["c"]}]`
-   Mappings: `{"array": "$.my_objects", "path": "tags"}`
-   Result: `["a", "b", "c"]`

#### Output Schema

The output is an object containing the resulting flattened array.
```json
{
  "result": [ ... ]
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.all_tags": "$.result"
}
```

---

### Full JSON Example

This step takes the output from a parallel step (which is an array of objects) and extracts just the `id` from each object into a simple array of IDs.

```json
"extract_ids": {
  "stepInstanceId": "extract_ids",
  "displayName": "Extract Processed IDs",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/flatten-array",
  "literals": {
    "path": "id"
  },
  "inputMappings": {
    "array": "$.steps_output.processed_items"
  },
  "outputMappings": {
    "$.flow_variables.processed_ids": "$.result"
  },
  "defaultNextStepInstanceId": "log_ids"
}
```