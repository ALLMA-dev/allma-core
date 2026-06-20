---
---

docs: document the 9 previously-undocumented step types (`MCP_CALL`, `FILE_DOWNLOAD`, `START_SUB_FLOW`, `EMAIL` / email-send, `EMAIL_START_POINT`, `SCHEDULE_START_POINT`, `system/s3-list-files`, `system/join-data`, `system/generate-uuid`) and correct the Admin API reference base path (`/v1/allma/...`). Also add a root `CLAUDE.md` that imports `AGENTS.md`, fix the websites CI workflow to only deploy on push to `main` (not on PRs), and document the docs auto-deploy flow.

Documentation, CI, and tooling only — no changes to any published `@allma/*` package, so no version bump is required (empty changeset).
