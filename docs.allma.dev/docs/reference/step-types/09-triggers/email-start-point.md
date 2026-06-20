---
title: EMAIL_START_POINT
---

# `EMAIL_START_POINT`

### Purpose

`EMAIL_START_POINT` is a **trigger** (start point) step. Instead of running in the middle of a flow, it defines an inbound email address that *starts* a flow execution. When an email arrives at the configured address, Allma parses it and launches a new execution of the flow, beginning at this step.

The platform maintains a mapping of email-address-plus-keyword to flow start points. When a message is received:

1.  The recipient address is looked up against all published email mappings.
2.  If a `keyword` is configured, the email body is searched for that keyword. The first start point whose keyword is found in the body wins. If no keyword matches (or the start point has no keyword), the default start point for that address is used.
3.  The flow must be **active**; otherwise the email is discarded.

This mechanism lets several flows — or several start points within one flow — share a single inbound email address, disambiguated by a `keyword` found in the body.

The full parsed email (sender details, subject, body, headers, and any attachments) is injected into the flow's **initial context data** under `triggeringEmail`, so downstream steps can read it via `$.triggeringEmail.*`.

> **Note:** `emailAddress` may be a literal address or a template such as `{{flow_variables.my_email}}`. Templates are rendered (using the flow's `flowVariables`) when the flow is published, and the *rendered* value must resolve to a valid email address. Two published flows cannot register the same `emailAddress` + `keyword` combination in the same environment.

---

### Configuration Parameters

| Parameter               | Type     | Required | Description                                                                                                                                                                                          |
| ----------------------- | -------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emailAddress`          | `string` |   Yes    | The unique email address that triggers this start point. May be a literal email (e.g., `support@flows.example.com`) or a template like `{{flow_variables.my_email}}`. Cannot be empty.              |
| `triggerMessagePattern` | `string` |    No    | A regex pattern matched against the email body (reserved for future use). If the pattern has a capture group, the value of the first group is extracted into `triggeringEmail.triggerPattern`.       |
| `keyword`               | `string` |    No    | An optional unique code used to distinguish multiple start points that share the same `emailAddress`. The flow starts here when this keyword is found anywhere in the email body.                   |

---

### Initial Context Data

When an inbound email triggers the flow, Allma parses the message (using SES + the stored MIME content) and starts the execution with an `initialContextData` object containing a single `triggeringEmail` key, available throughout the flow at `$.triggeringEmail`.

```json
{
  "triggeringEmail": {
    "from": "Jane Doe <jane@example.com>",
    "senderName": "Jane Doe",
    "senderFullEmail": "jane@example.com",
    "senderEmailPrefix": "jane",
    "to": "support@flows.example.com",
    "cc": ["team@example.com"],
    "bcc": [],
    "replyTo": ["jane@example.com"],
    "subject": "Order #12345 - help needed",
    "headers": [
      { "key": "message-id", "value": "<abc123@example.com>" },
      { "key": "date", "value": "Sat, 20 Jun 2026 10:15:00 +0000" }
    ],
    "body": "Hi, I need help with my recent order...",
    "htmlBody": "<p>Hi, I need help with my recent order...</p>",
    "attachments": [
      {
        "filename": "receipt.pdf",
        "contentType": "application/pdf",
        "size": 48213,
        "s3Location": {
          "bucket": "allma-incoming-emails",
          "key": "attachments/<messageId>/0/receipt.pdf"
        },
        "contentId": null,
        "disposition": "attachment"
      }
    ],
    "triggerPattern": "12345"
  }
}
```

**Field reference for `triggeringEmail`:**

| Field               | Type       | Description                                                                                                  |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `from`              | `string?`  | The full `From` header, which may include a display name (e.g., `"Jane Doe <jane@example.com>"`).            |
| `senderName`        | `string?`  | The sender's display name, if available.                                                                     |
| `senderFullEmail`   | `string?`  | The sender's full email address (e.g., `jane@example.com`).                                                  |
| `senderEmailPrefix` | `string?`  | The local part of the sender's address (e.g., `jane` from `jane@example.com`).                               |
| `to`                | `string`   | The recipient address that triggered the flow.                                                               |
| `cc`                | `string[]?`| CC recipient addresses.                                                                                       |
| `bcc`               | `string[]?`| BCC recipient addresses (only present if the recipient appeared in the BCC field).                           |
| `replyTo`           | `string[]?`| Reply-To addresses.                                                                                          |
| `subject`           | `string?`  | The email subject.                                                                                            |
| `headers`           | `array?`   | All email headers as `{ key, value }` pairs.                                                                  |
| `body`              | `string`   | The plain-text body of the email.                                                                            |
| `htmlBody`          | `string?`  | The HTML body, if present.                                                                                    |
| `attachments`       | `array`    | Attachments extracted from the email and stored in S3. Defaults to `[]`. See the attachment shape below.     |
| `triggerPattern`    | `string?`  | Value extracted from the body when a `triggerMessagePattern` (with a capture group) is configured.           |

**Attachment shape:**

| Field         | Type     | Description                                                                       |
| ------------- | -------- | -------------------------------------------------------------------------------- |
| `filename`    | `string` | The original attachment filename.                                                |
| `contentType` | `string` | The attachment MIME type (defaults to `application/octet-stream` if unknown).     |
| `size`        | `number` | The attachment size in bytes.                                                     |
| `s3Location`  | `object` | `{ bucket, key }` pointer to where the attachment content was stored in S3.       |
| `contentId`   | `string?`| The MIME `Content-ID`, if present (useful for inline images).                     |
| `disposition` | `string?`| The content disposition (e.g., `attachment` or `inline`).                         |

---

### Full JSON Example

A start point that listens on a support address. It uses a `keyword` so the same address can serve multiple flows, and a `triggerMessagePattern` to pull an order number out of the body into `triggeringEmail.triggerPattern`.

```json
"support_email_trigger": {
  "stepInstanceId": "support_email_trigger",
  "displayName": "Support Email Start Point",
  "stepType": "EMAIL_START_POINT",
  "emailAddress": "support@flows.example.com",
  "keyword": "ORDER-HELP",
  "triggerMessagePattern": "Order #(\\d+)",
  "defaultNextStepInstanceId": "classify_request"
}
```

In this example, an email sent to `support@flows.example.com` whose body contains `ORDER-HELP` starts this flow. The regex `Order #(\d+)` captures the order number (e.g., `12345`) from the body and exposes it at `$.triggeringEmail.triggerPattern`, while the rest of the parsed email is available under `$.triggeringEmail`.
