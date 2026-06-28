---
"@allma/flow-builder": minor
---

Add an out-of-band drift guard for code-owned flows (Flows-as-Code Phase 2, RFC §6).

`detectDrift(localCodeFlows, fetchDeployed)` compares each code-owned flow against its deployed
copy and reports drift when the live version was taken over by the Visual Editor
(`authoringSource` no longer `'code'`) or its authored fields no longer match the source. The
`allma-flows check` command gains an opt-in `--remote <baseUrl>` flag that fetches deployed flow
versions from the admin API (bearer token from `ALLMA_ADMIN_TOKEN`) and fails CI on drift. Without
`--remote`, `check` is unchanged and performs no network calls.
