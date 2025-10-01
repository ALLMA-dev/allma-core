---
title: s3-data-loader
---

# `system/s3-data-loader`

### Purpose

A data loading module that fetches an object from Amazon S3 and parses its content. It can return the content as a string, a parsed JSON object, or a raw buffer.

---

### Configuration Parameters (`customConfig`)

| Parameter      | Type     | Required | Description                                                                                                                              |
| -------------- | -------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceS3Uri`  | `string` |   Yes    | The full S3 URI of the object to fetch (e.g., `s3://my-bucket/path/to/file.json`). This field supports Handlebars templating.              |
| `outputFormat` | `string` |    No    | How to parse and return the content: `TEXT` (default), `JSON`, or `RAW_BUFFER` (returns a Base64 encoded string).                         |
| `onMissing`    | `string` |    No    | Behavior if the S3 object is not found: `FAIL` (default, the step fails) or `IGNORE` (the step succeeds and outputs `null`).                |
| `encoding`     | `string` |    No    | The text encoding to use when reading the file as `TEXT` or `JSON`. Defaults to `utf-8`.                                                   |
| `region`       | `string` |    No    | The AWS region of the S3 bucket. If omitted, the Lambda's default region is used. Useful for cross-region access.                         |

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not use `inputMappings`.

#### Output Schema

The output is an object containing the fetched content and metadata about the S3 object.
```json
{
  "content": "file content here", // or { ... } or "base64-string"
  "_meta": {
    "found": true,
    "sourceS3Uri": "s3://...",
    "contentType": "application/json",
    "contentLength": 1234,
    "eTag": "..."
  }
}
```

**Output Mapping Example:**
To place the parsed JSON content into the context:
```json
"outputMappings": {
  "$.steps_output.config_file": "$.content"
}
```

---

### Full JSON Example

This step fetches a JSON configuration file from S3, using the `flowExecutionId` as part of the key.

```json
"load_config_from_s3": {
  "stepInstanceId": "load_config_from_s3",
  "displayName": "Load Job Config from S3",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/s3-data-loader",
  "customConfig": {
    "sourceS3Uri": "s3://my-job-bucket/configs/{{flowExecutionId}}.json",
    "outputFormat": "JSON",
    "onMissing": "FAIL"
  },
  "outputMappings": {
    "$.flow_variables.job_config": "$.content"
  },
  "defaultNextStepInstanceId": "run_job"
}
```