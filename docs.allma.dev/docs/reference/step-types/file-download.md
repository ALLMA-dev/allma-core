---
title: FILE_DOWNLOAD
sidebar_position: 3.6
---

# `FILE_DOWNLOAD`

### Purpose

The `FILE_DOWNLOAD` step downloads a file from a URL and streams it **directly to S3**, without holding the entire file in memory. It outputs an S3 pointer that downstream steps can reference (for example, as an email attachment or as input to a parsing step).

Because the file is streamed straight to S3 using the AWS SDK multipart `Upload` utility, this step robustly handles large files and responses where the `Content-Length` is unknown.

Typical use cases:

- Fetching a document, image, or export from an external API or signed URL.
- Persisting a remote asset into a workflow's storage so later steps can process it.
- Capturing a generated report from a third-party service for archival or further handling.

The source URL, request headers, and destination key all support templating, so you can build them dynamically from the flow's context data.

---

### Configuration Parameters

| Parameter | Type | Required | Description |
| --- | --- | :---: | --- |
| `sourceUrlTemplate` | `string` | Yes | The URL of the file to download. Supports templates. Must be non-empty. |
| `method` | `string` (`HttpMethod`) | No | HTTP method used to request the file. One of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`. Defaults to `GET`. |
| `headersTemplate` | `object` (map of `string` → JSONPath string) | No | Map of request header names to JSONPath expressions resolved against the step context. Use this to supply values such as `Authorization`. A header is omitted if its JSONPath resolves to `null`/`undefined`. |
| `destinationBucket` | `string` | No | Optional S3 bucket name to write the file into. Defaults to the system execution traces bucket. |
| `destinationKeyTemplate` | `string` | No | Optional S3 key template. Supports templating. If omitted, a key is auto-generated under `downloads/<flowExecutionId>/<stepInstanceId>/<uuid>`. |
| `moduleIdentifier` | `string` | No | Optional system module identifier. Defaults to `system/file-download`. |
| `customConfig.timeoutMs` | `number` (positive integer) | No | Request timeout in milliseconds. Defaults to `30000` (30 seconds). |
| `customConfig.verifySsl` | `boolean` | No | Whether to verify the server's SSL certificate. Defaults to `true`. Set to `false` to allow self-signed or untrusted certificates. |

---

### Input & Output

#### Input Mappings

The `FILE_DOWNLOAD` step has no fixed `inputMappings` schema. Instead, the flow's context data is made available to all templated fields (`sourceUrlTemplate`, `destinationKeyTemplate`) and to the JSONPath expressions in `headersTemplate`.

- **Template fields** (`sourceUrlTemplate`, `destinationKeyTemplate`) are rendered against the combined context (current context data, runtime state, and step input).
- **Header values** in `headersTemplate` are resolved as JSONPath expressions against that same context. For example, mapping the header `Authorization` to `$.secrets.apiToken` pulls the token from the context.

#### Output Schema

On success, the step produces the following output:

```json
{
  "filePointer": {
    "bucket": "my-downloads-bucket",
    "key": "downloads/exec-123/step-abc/9f1c2e3a-....bin"
  },
  "content": {
    "_s3_output_pointer": {
      "bucket": "my-downloads-bucket",
      "key": "downloads/exec-123/step-abc/9f1c2e3a-....bin"
    }
  },
  "contentType": "application/pdf",
  "contentLength": 154238,
  "_meta": {
    "status": "SUCCESS",
    "sourceUrl": "https://example.com/reports/latest.pdf"
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `filePointer` | `S3Pointer` (`{ bucket, key }`) | The S3 pointer to the downloaded file, for manual reference. |
| `content._s3_output_pointer` | `S3Pointer` (`{ bucket, key }`) | The same pointer wrapped in the standard `_s3_output_pointer` envelope so downstream steps can auto-hydrate the file contents. |
| `contentType` | `string` | The `Content-Type` returned by the source, or `application/octet-stream` if not provided. |
| `contentLength` | `number` \| `undefined` | The size in bytes, parsed from the response `Content-Length` header. Omitted when the source does not report a length. |
| `_meta.status` | `string` | `"SUCCESS"` on completion. |
| `_meta.sourceUrl` | `string` | The fully rendered source URL that was downloaded. |

**Output Mapping Example:**

To forward the downloaded file to a later step that auto-hydrates the S3 pointer, reference the wrapped envelope:

```json
"outputMappings": {
  "$.steps_output.invoice.document": "$.content",
  "$.steps_output.invoice.contentType": "$.contentType"
}
```

---

### Full JSON Example

This step requests an invoice PDF from an external API using a bearer token resolved from the context, streams the response into the `my-downloads-bucket` S3 bucket under a templated key, and outputs an S3 pointer that subsequent steps can attach to an email or parse.

```json
"download_invoice": {
  "stepInstanceId": "download_invoice",
  "displayName": "Download Invoice PDF",
  "stepType": "FILE_DOWNLOAD",
  "moduleIdentifier": "system/file-download",
  "sourceUrlTemplate": "https://api.example.com/v1/invoices/{{flow_variables.invoiceId}}/pdf",
  "method": "GET",
  "headersTemplate": {
    "Authorization": "$.secrets.exampleApiToken"
  },
  "destinationBucket": "my-downloads-bucket",
  "destinationKeyTemplate": "invoices/{{flow_variables.invoiceId}}/{{flowExecutionId}}.pdf",
  "customConfig": {
    "timeoutMs": 60000,
    "verifySsl": true
  },
  "outputMappings": {
    "$.steps_output.invoice.document": "$.content"
  },
  "defaultNextStepInstanceId": "email_invoice"
}
```
