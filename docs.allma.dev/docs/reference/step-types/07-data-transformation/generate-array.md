---
title: generate-array
---

# `system/generate-array`

### Purpose

A simple data transformation module that generates an array of sequential integers from 0 to `count - 1`. This is useful for creating a fixed number of iterations for a subsequent `PARALLEL_FORK_MANAGER` step.

---

### Configuration Parameters (via Input Mappings)

| Parameter | Type     | Required | Description                                  |
| --------- | -------- | :------: | -------------------------------------------- |
| `count`   | `number` |   Yes    | The integer number of items to generate in the array. |

---

### Input & Output

#### Input Mappings

**Example:**
To generate an array with 5 items:
```json
"literals": {
  "count": 5
}
```

#### Output Schema

The output is an object containing the generated array.
```json
{
  "array": [0, 1, 2, 3, 4]
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.iteration_list": "$.array"
}
```

---

### Full JSON Example

This step creates an array of 3 items, which will cause the subsequent parallel step to run its branch 3 times.

```json
"create_iterations": {
  "stepInstanceId": "create_iterations",
  "displayName": "Create 3 Iterations",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/generate-array",
  "literals": {
    "count": 3
  },
  "outputMappings": {
    "$.steps_output.iterations": "$.array"
  },
  "defaultNextStepInstanceId": "run_in_parallel"
}
```