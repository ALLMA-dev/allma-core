---
---

docs: remove noise and fix incorrect references in the documentation site. Delete leftover Docusaurus scaffolding (the `markdown-page.md` example page and the empty `HomepageFeatures` component), clean placeholder metadata and dead imports from the homepage, fix the broken social-card image and remove "replace with your…" scaffolding comments in `docusaurus.config.ts`, and align the docs `README.md` on `npm`.

Also fix stale/incorrect content: correct the non-existent `packages/allma-core/...` source paths in the contribution tutorial and architecture deep-dive to the real flat package layout (`packages/core-types`, `packages/app-logic`), fix the `cd allma` → `cd allma-core` clone directory in the quick-start, close an unterminated JSON code fence in `poll-external-api`, remove leftover `TODO`/broken-image placeholders, correct a non-existent `SQS_SEND` step-type reference, resolve an `array-aggregator` example inconsistency, and link the hand-written Admin API overview page in the sidebar instead of an auto-generated index.

Documentation site only — no changes to any published `@allma/*` package, so no version bump is required (empty changeset).
