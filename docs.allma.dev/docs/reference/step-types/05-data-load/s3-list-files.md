---
title: s3-list-files
---

# `system/s3-list-files`

### Purpose

A data loading module that lists objects in an Amazon S3 bucket under an optional prefix. It paginates through results automatically (using `ListObjectsV2` continuation tokens), filters out zero-byte "directory" placeholder objects, and returns an array of file descriptors. Each descriptor includes file metadata plus a standard S3 output pointer, so downstream steps (such as `PARALLEL_FORK_MANAGER`) can iterate over the files and automatically hydrate each file's content on demand.

---

### Configuration Parameters (`customConfig`)

| Parameter | Type     | Required | Description                                                                                                                                                                 |
| --------- | -------- | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bucket`  | `string` |   Yes    | The name of the S3 bucket to list objects from. Must be a non-empty string.                                                                                                  |
| `prefix`  | `string` |    No    | Limits the results to keys that begin with this prefix (e.g. `inbox/2026/`). If omitted, the entire bucket is listed.                                                        |
| `maxKeys` | `number` |    No    | The maximum number of files to return. Must be a positive integer. Pagination stops once this many files have been collected. If omitted, all matching files are returned.   |

> **Note:** Zero-byte objects (commonly used by S3 consoles to represent "folders") are automatically excluded from the results, so they do not count toward the returned files or `maxKeys`.

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not rely on `inputMappings`. The resolved `customConfig` is validated against the schema `{ bucket, prefix?, maxKeys? }`; an invalid configuration causes the step to fail.

#### Output Schema

The output is an object containing the list of files and a total count. Each entry in `files` carries metadata along with a `content` field wrapping an S3 output pointer. The runtime's S3 pointer hydration utility automatically replaces `content` with the actual object content when it is referenced by a downstream step (e.g. via `$.currentItem.content`).

```json
{
  "files": [
    {
      "key": "inbox/2026/order-001.json",
      "size": 2048,
      "lastModified": "2026-06-20T12:34:56.000Z",
      "eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "bucket": "my-data-bucket",
      "content": {
        "_s3_output_pointer": {
          "bucket": "my-data-bucket",
          "key": "inbox/2026/order-001.json"
        }
      }
    }
  ],
  "fileCount": 1
}
```

| Field       | Type     | Description                                                                                                  |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `files`     | `array`  | The list of matching file descriptors.                                                                       |
| `fileCount` | `number` | The total number of files returned (equal to `files.length`).                                                |

Each entry in `files` has the following shape:

| Field          | Type     | Description                                                                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `key`          | `string` | The full object key within the bucket.                                                                                                 |
| `size`         | `number` | The object size in bytes.                                                                                                              |
| `lastModified` | `string` | The last-modified timestamp as an ISO 8601 string.                                                                                     |
| `eTag`         | `string` | The object's ETag.                                                                                                                     |
| `bucket`       | `string` | The bucket the object was listed from.                                                                                                 |
| `content`      | `object` | An S3 output pointer (`{ "_s3_output_pointer": { bucket, key } }`) that is automatically hydrated into the file content when referenced. |

**Output Mapping Example:**
To place the list of files into the flow context for a downstream loop:
```json
"outputMappings": {
  "$.flow_variables.input_files": "$.files",
  "$.flow_variables.input_file_count": "$.fileCount"
}
```

---

### Full JSON Example

This step lists up to 500 JSON files under a date-based prefix, then makes the resulting array available to a downstream parallel-processing step.

```json
"list_pending_orders": {
  "stepInstanceId": "list_pending_orders",
  "displayName": "List Pending Order Files",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/s3-list-files",
  "customConfig": {
    "bucket": "my-data-bucket",
    "prefix": "inbox/2026/orders/",
    "maxKeys": 500
  },
  "outputMappings": {
    "$.flow_variables.input_files": "$.files",
    "$.flow_variables.input_file_count": "$.fileCount"
  },
  "defaultNextStepInstanceId": "process_orders"
}
```
