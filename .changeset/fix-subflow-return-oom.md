---
"@allma/core-sdk": minor
"@allma/core-cdk": patch
---

Fix `Runtime.OutOfMemory` when returning from a sub-flow whose output mixes inline fields with
S3-offloaded (`_s3_output_pointer`) values.

The template renderer used to hydrate the **entire** context on every `render()` call
(`hydrateInputFromS3Pointers`), so rendering even a one-token template (an ARN, a URL, a flow id)
pulled every offloaded blob in the context back into Lambda memory at once — undoing the offloading
the sub-flow performed to stay small. `renderNestedTemplates` amplified this by rendering each field
of a step's config in parallel, each re-hydrating the whole context concurrently, which is what
exhausted memory even when the returned `steps_output` looked small.

`TemplateService.render()` now statically inspects the Handlebars template and hydrates only the S3
pointers the template actually references, leaving unreferenced offloaded branches as pointers. It
falls back to full hydration only for constructs whose data dependencies can't be resolved
statically (block helpers, `../`, `@root`, bare `this`) — so behavior is unchanged for those.

`@allma/core-sdk` adds an optional `S3HydrationCache` (and `resolveS3PointerCached`) that
`hydrateInputFromS3Pointers` accepts; a single cache is now shared across all fields of a config so a
pointer referenced by many fields is downloaded once instead of once per field.
