---
title: email-sender
---

# `system/email-send`

### Purpose

The `system/email-send` module sends an email through **AWS SES**. It is a step of type `EMAIL` and supports HTML bodies, multiple recipients (To/CC/BCC), a Reply-To address, custom headers, and file attachments pulled from S3.

Every text field supports **Handlebars/JSONPath templates**, so addresses, subject, and body can be built dynamically from the flow context at runtime. After templates are rendered, the executor strictly validates that all addresses resolve to valid email addresses before the message is sent.

Two delivery paths are used automatically:

- **No attachments** → a simple SES `SendEmail` call.
- **With attachments** → a raw multipart MIME message via SES `SendRawEmail`, with attachment bytes streamed from S3 and base64-encoded. The combined attachment size must stay under a ~7 MB safe limit.

The sender (`from`) must be a **verified SES identity**.

---

### Configuration Parameters

| Parameter | Type | Required | Description |
| --- | --- | :---: | --- |
| `from` | `string` (template) | Yes | The sender's email address. Must be a verified SES identity. |
| `fromName` | `string` (template) | No | Optional display name for the sender (e.g. `Allma Support`), rendered as `"Name" <from@domain>`. |
| `to` | `string \| string[]` (template) | Yes | A single email, comma-separated emails, a JSON array string, or a template/JSONPath resolving to a string or array of addresses. |
| `cc` | `string \| string[]` (template) | No | Carbon-copy recipient(s). Same formats as `to`. |
| `bcc` | `string \| string[]` (template) | No | Blind-carbon-copy recipient(s). Same formats as `to`. |
| `replyTo` | `string \| string[]` (template) | No | Reply-To address(es). Same formats as `to`. |
| `subject` | `string` (template) | Yes | The email subject line. |
| `body` | `string` (template) | Yes | The email body. HTML is supported. |
| `customHeaders` | `{ name, value }[] \| string` (template) | No | A static list of custom headers, a JSONPath string to such an array, or a Handlebars template producing one. |
| `attachments` | `{ filename, s3Pointer }[]` | No | A **static** list of files to attach, each referencing an S3 object (`s3Pointer = { bucket, key }`) and a `filename` for the recipient. Mutually exclusive with `attachmentsPath`. |
| `attachmentsPath` | `string` (JSONPath) | No | A **dynamic** JSONPath pointing to an array of attachment objects in the flow context (e.g. `$.steps_output.my_step.files`). Mutually exclusive with `attachments`. |

:::warning Attachments are mutually exclusive
Set **either** `attachments` (static list) **or** `attachmentsPath` (dynamic JSONPath) — never both; supplying both is rejected. When `attachmentsPath` resolves to `undefined`, the email is sent with no attachments; if it resolves to a non-array or malformed objects, the step fails with a permanent error.
:::

---

### Input & Output

#### Input Mappings

This step does not use a generic `inputMappings` block. Instead, the configuration fields listed above are defined directly on the step instance and act as the inputs. Each field is rendered against a template context built from the current flow context, runtime state, and any step input.

Notes on how the config is resolved at runtime:

- All string fields are rendered as Handlebars/JSONPath templates. `attachmentsPath` is deliberately **not** pre-rendered — its raw JSONPath is evaluated against the live context to fetch the attachment array.
- Address fields accept a single address, a comma-separated list, or a JSON array string (e.g. `["a@x.com","b@x.com"]`); `"Name <email@x.com>"` forms are accepted with the bare address extracted for validation.
- Rendered addresses are validated as real email addresses before sending. Invalid `from`/`to`/`cc`/`bcc`/`replyTo` values cause the step to fail.

#### Output Schema

On success the step returns an object containing the SES message ID, the fully rendered email parameters that were actually sent, and a status metadata block.

```json
{
  "sesMessageId": "0102018f...-a1b2c3d4-...",
  "renderedEmail": {
    "from": "noreply@allma.dev",
    "fromName": "Allma Notifications",
    "to": ["customer@example.com"],
    "subject": "Your order #1234 has shipped",
    "body": "<h1>Thanks for your order!</h1>",
    "attachments": [
      { "filename": "invoice.pdf", "s3Pointer": { "bucket": "my-bucket", "key": "invoices/1234.pdf" } }
    ]
  },
  "_meta": { "status": "SUCCESS" }
}
```

| Output Field | Type | Description |
| --- | --- | --- |
| `sesMessageId` | `string` | The SES `MessageId` returned for the sent message. |
| `renderedEmail` | `object` | The validated, post-template email parameters that were sent (optional fields appear only when supplied). |
| `_meta.status` | `string` | Delivery status; `"SUCCESS"` when the SES call succeeds. |

**Output Mapping Example:**

Capture the SES message ID into the flow context for later auditing:

```json
"outputMappings": {
  "$.steps_output.send_notification.messageId": "$.sesMessageId"
}
```

---

### Full JSON Example

A realistic `EMAIL` step instance that sends an HTML order-confirmation email with a CC, a custom header, and a single static S3 attachment:

```json
"send_order_confirmation": {
  "stepInstanceId": "send_order_confirmation",
  "displayName": "Send Order Confirmation",
  "stepType": "EMAIL",
  "from": "noreply@allma.dev",
  "fromName": "Allma Notifications",
  "to": "{{steps_output.lookup_customer.email}}",
  "cc": "fulfillment@allma.dev",
  "replyTo": "support@allma.dev",
  "subject": "Your order #{{flow_variables.orderId}} has shipped",
  "body": "<h1>Thanks for your order!</h1><p>Your order <strong>#{{flow_variables.orderId}}</strong> is on its way. Your invoice is attached.</p>",
  "customHeaders": [
    { "name": "X-Campaign-Id", "value": "order-shipped" }
  ],
  "attachments": [
    {
      "filename": "invoice-{{flow_variables.orderId}}.pdf",
      "s3Pointer": {
        "bucket": "allma-documents",
        "key": "invoices/{{flow_variables.orderId}}.pdf"
      }
    }
  ],
  "outputMappings": {
    "$.steps_output.send_order_confirmation.messageId": "$.sesMessageId",
    "$.steps_output.send_order_confirmation.status": "$._meta.status"
  },
  "defaultNextStepInstanceId": "log_notification_sent"
}
```

To attach a **dynamic** list of files instead of a static one, replace the `attachments` block with `attachmentsPath` (and do not set both):

```json
"attachmentsPath": "$.steps_output.generate_reports.files"
```

The path must resolve to an array of `{ "filename": "...", "s3Pointer": { "bucket": "...", "key": "..." } }` objects.
