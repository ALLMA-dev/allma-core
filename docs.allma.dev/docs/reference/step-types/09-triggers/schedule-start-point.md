---
title: SCHEDULE_START_POINT
---

# `SCHEDULE_START_POINT`

### Purpose

`SCHEDULE_START_POINT` is a **trigger / start point** that begins a new flow execution automatically on a recurring schedule. It is backed by **AWS EventBridge Scheduler**: when a flow version is published, Allma creates (or updates) a managed schedule for each `SCHEDULE_START_POINT` step in the definition. When the schedule fires, it enqueues a flow start request, and a new execution of the flow begins.

Each schedule is driven by a standard AWS **cron** or **rate** expression and may run in a specific timezone. An optional `payloadTemplate` lets you inject static (or template-rendered) data into the flow's initial context so downstream steps have something to work with.

Key behaviors:

- The schedule's state is set to `ENABLED` only when **all** of the following are true: the flow version is published, the step's `enabled` flag is `true`, and the flow's agent is active. Otherwise the schedule is created in a `DISABLED` state.
- The schedule fires with `FlexibleTimeWindow` set to `OFF` (exact-time invocation, no jitter).
- Both `scheduleExpression` and the values inside `payloadTemplate` support Allma template rendering. They are rendered at publish time against a context of `{ flow_variables }`, so you can reference flow variables (e.g. `{{flow_variables.my_value}}`) inside them.
- The trigger records `triggerSource` as `ScheduleTrigger:<stepInstanceId>` on the resulting execution.

> **Note:** The schedule is provisioned during flow version sync. Changes take effect when the flow version is published/synchronized, not instantly on every edit.

---

### Configuration Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | :---: | :---: | --- |
| `scheduleExpression` | `string` | Yes | — | The cron or rate expression that defines when the flow runs, e.g. `cron(5 8 ? * MON-FRI *)` or `rate(1 hour)`. Supports template rendering against `flow_variables`. |
| `timezone` | `string` | No | `UTC` | IANA timezone name used to interpret the schedule, e.g. `America/New_York`. When omitted, the schedule runs in UTC. |
| `enabled` | `boolean` | No | `true` | Enables or disables this schedule trigger. The schedule is only `ENABLED` in EventBridge when this is `true` **and** the flow is published with an active agent. |
| `payloadTemplate` | `object` (record) | No | — | A static JSON payload merged into the flow's initial context data when the schedule triggers. String values support template rendering against `flow_variables`. |

---

### Initial Context Data

When the schedule fires, the (rendered) `payloadTemplate` is passed as the execution's `initialContextData`. Allma then builds the flow's initial context by spreading that data at the root and adding the standard system fields. Given a `payloadTemplate` of `{ "source": "nightly-cron", "batchSize": 100 }`, the flow's initial context data looks like:

```json
{
  "source": "nightly-cron",
  "batchSize": 100,
  "steps_output": {},
  "flow_variables": {
    "flowExecutionId": "a1b2c3d4-0000-0000-0000-000000000000"
  }
}
```

Notes:

- The keys from `payloadTemplate` are placed at the **root** of the context, alongside `steps_output` and `flow_variables`.
- `steps_output` starts as an empty object and is populated as the flow runs.
- `flow_variables` is composed from the agent variables, the flow definition's variables, and any `flow_variables` key present in the payload, with `flowExecutionId` always injected.
- If `payloadTemplate` is omitted, `initialContextData` defaults to `{}` and the context contains only the system-provided fields.
- The execution is tagged with `triggerSource: "ScheduleTrigger:<stepInstanceId>"` for traceability (stored on the execution record, not inside the context data).

---

### Full JSON Example

A realistic step instance for a `SCHEDULE_START_POINT` that runs every weekday at 08:05 in New York time:

```json
"schedule_weekday_morning": {
  "stepInstanceId": "schedule_weekday_morning",
  "displayName": "Weekday Morning Trigger",
  "stepType": "SCHEDULE_START_POINT",
  "scheduleExpression": "cron(5 8 ? * MON-FRI *)",
  "timezone": "America/New_York",
  "enabled": true,
  "payloadTemplate": {
    "source": "nightly-cron",
    "reportType": "daily-summary",
    "batchSize": 100
  },
  "defaultNextStepInstanceId": "load_pending_records"
}
```
