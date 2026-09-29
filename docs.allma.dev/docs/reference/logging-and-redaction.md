---
title: Logging and Redaction
---

# Logging and Redaction

Every platform Lambda logs through the structured logger in `@allma/core-sdk`. You can use the same
logger in your own Lambdas. You can also mask sensitive values, such as emails or names, in every
log line in one place.

## Log line format

`log_debug`, `log_info`, `log_warn`, `log_error` and `log_critical` each write one JSON line to
stdout:

```typescript
import { log_info } from '@allma/core-sdk';

log_info('Order received', { orderId: 'ord-42', itemCount: 3 }, flowExecutionId);
```

```json
{"level":"INFO","message":"Order received","correlationId":"<flowExecutionId>","orderId":"ord-42","itemCount":3,"timestamp":"2026-01-01T00:00:00.000Z"}
```

- The keys of `details` are spread into the top level of the line.
- `correlationId` is `"N/A"` when you pass none.
- Lines below the `LOG_LEVEL` env var are dropped. The default level is `INFO`.

Platform Lambdas take `LOG_LEVEL` from `StageConfig.logging.logLevel`. The raw event dumps (the
iterative step processor's `RAW_EVENT`, the async handler context, the flow-start SQS body and MCP
error bodies) are written at `DEBUG`. They do not appear at the default `INFO` level. Set the level
to `DEBUG` to see them.

## Redaction in your own Lambdas

Register one redactor with `setLogRedactor`. It applies to every level. It is called once with
`details` (it must return a plain object) and once with `message` (it must return a string), so
values interpolated into a message are covered too.

```typescript
import { setLogRedactor, createKeyPatternRedactor } from '@allma/core-sdk';

setLogRedactor(
  createKeyPatternRedactor({
    keys: ['email', 'phoneNumber'],
    patterns: ['[^@\\s]+@[^@\\s]+'],
  }),
);
```

`createKeyPatternRedactor({ keys, patterns, replacement? })` builds a ready-made redactor:

- The value of any key named in `keys` (case-insensitive, at any depth) becomes `replacement`.
- Every match of each regular expression in `patterns` (compiled with `gi`) inside a string, and
  inside the message, becomes `replacement`.
- `replacement` defaults to `'[REDACTED]'`.
- It walks only arrays and plain objects. Dates, Errors and Buffers are serialised as before.
  Circular references become `'[Circular]'`. The input is never changed.

You can pass any function instead: `setLogRedactor((value) => ...)`. Pass `undefined` to remove it.
The redactor is stored process-wide, so every copy of `@allma/core-sdk` in one bundle shares it.

## Redaction in platform Lambdas

Platform Lambdas are bundled separately and never load your code. Give them rules through the stage
config instead:

```typescript
const stageConfig = {
  // ...
  logging: {
    logLevel: LogLevel.INFO,
    retentionDays: { default: 30, traces: 30, executionLogs: 30, sfn: 30 },
    redaction: {
      keys: ['email', 'phoneNumber'],
      patterns: ['[^@\\s]+@[^@\\s]+'],
    },
  },
};
```

The CDK validates `redaction` at synth time and passes it to every platform Lambda in the
`LOG_REDACTION_CONFIG` env var. A pattern that is not a valid regular expression fails synth. When
the logger loads, it builds a `createKeyPatternRedactor` from that env var.

If the env var is set on a Lambda but is not valid, the logger writes one warning and then masks
every line, as described in [Failure behaviour](#failure-behaviour). It never falls back to raw
output.

## Precedence

A redactor you register with `setLogRedactor` wins. The logger uses `LOG_REDACTION_CONFIG` only if
no redactor is registered when it loads, and a later `setLogRedactor` call replaces it.

## Failure behaviour

If the redactor throws, returns a non-plain-object for `details`, or returns a non-string for the
message, the line is still written, but with both values replaced:

```json
{"level":"INFO","message":"[REDACTION_FAILED]","correlationId":"<id>","details":"[REDACTION_FAILED]","timestamp":"..."}
```

Neither the raw message nor the raw details appear.

## No redaction configured

With no redactor registered and no `redaction` in the stage config, the output is exactly the same
as without this feature.
