# Migrating Gemini from API Key → Vertex AI

**Status:** In progress
**Author:** Platform / AI agent
**Scope:** Platform only (`packages/*`, `core-cdk`). Backward-compatible, feature-flagged.

---

## 1. Motivation

The Gemini Developer API (AI Studio **API key**) has low per-project rate limits
(RPM / TPM / RPD) that throttle production flows. **Vertex AI** ("Vertex" /
"enterprise" mode) offers dramatically higher quota (dynamic shared quota +
optional Provisioned Throughput), SLAs, data-residency control, no
prompt-data-for-training clause, and unified GCP IAM governance.

We want `LLM_INVOCATION` steps with `provider: GEMINI` to be able to call Gemini
**through Vertex AI** instead of the key-based Developer API.

## 2. Key enabler — we are already 90% there

The codebase uses the **unified `@google/genai` SDK** (`^1.47.0` in `app-logic`,
`^1.28.0` in `core-cdk`), which speaks **both** backends from the same surface:

| Backend | Constructor |
| --- | --- |
| Gemini Developer API (today) | `new GoogleGenAI({ apiKey })` |
| Vertex AI (target) | `new GoogleGenAI({ vertexai: true, project, location })` |

Everything downstream of the constructor — `client.models.generateContent(...)`,
JSON mode (`responseMimeType`), safety settings, `inlineData` media, token usage,
retries — is **backend-agnostic and unchanged**.

The whole Gemini surface is one file:
`packages/app-logic/src/allma-core/llm-adapters/gemini-adapter.ts`. The only
backend-specific code is `getClient()` (lines ~70-75).

## 3. The one real challenge — authentication from AWS Lambda

Vertex does **not** accept the AI Studio API key. It authenticates via Google IAM
(short-lived OAuth tokens via Application Default Credentials). From AWS Lambda
there are two ways to bridge:

| | **Option A — Service Account key (JSON)** | **Option B — Workload Identity Federation (WIF)** ✅ prod |
| --- | --- | --- |
| Stored secret | SA private-key JSON in Secrets Manager | Credential-config file (no private key) |
| How | SDK signs JWT → OAuth token | AWS creds → GCP STS → impersonate SA → OAuth token |
| Security | ⚠️ long-lived key, must rotate | ✅ no static key, short-lived tokens |
| Setup | Lower | Higher (one-time WIF pool/provider + IAM binding) |
| Google's stance | Discouraged | Preferred for external clouds |

**Decision:** support both in code. Option A unblocks an immediate proof of
concept; Option B (WIF) is the production target. If no SA-key secret is
configured, the adapter falls back to ADC (works with WIF via
`GOOGLE_APPLICATION_CREDENTIALS` pointing at a bundled credential-config file).

## 4. Model-ID caveat

Vertex and the Developer API do **not** share every model alias. Developer-API
`-latest` aliases (e.g. `gemini-1.5-pro-latest`) are generally **invalid on
Vertex**, which wants pinned IDs / its own aliases (e.g. `gemini-2.0-flash`,
`gemini-1.5-pro-002`). Because `modelId` is now templated from config
(`{{config.llmModels.*}}`, via the templated-model-selection feature), this is
mostly fixed by **updating config values**, not code. Audit hardcoded `-latest`
IDs (incl. admin step docs).

## 5. Implementation

### 5.1 Code — `core-types`
- `ENV_VAR_NAMES` (`src/common/shared.ts`): add
  `GEMINI_USE_VERTEX`, `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_SA_KEY_SECRET_ARN`.

### 5.2 Code — `app-logic` (`gemini-adapter.ts`)
- Make `getClient()` config-driven:
  - `GEMINI_USE_VERTEX === 'true'` → `new GoogleGenAI({ vertexai: true, project, location, googleAuthOptions? })`.
    - If `GCP_SA_KEY_SECRET_ARN` set → fetch JSON from Secrets Manager, pass
      `googleAuthOptions: { credentials: { client_email, private_key }, projectId }`.
    - Else → omit `googleAuthOptions`, rely on ADC / WIF.
  - else → existing `new GoogleGenAI({ apiKey })` path (unchanged default).
- Keep the singleton cache; the API-key path and secret JSON shape
  `{ GeminiApiKey }` stay intact.

### 5.3 Infra — `core-cdk`
- `StageConfig` (`lib/config/stack-config.ts`): add optional `gemini` block:
  `{ useVertex?, gcpProjectId?, gcpLocation?, serviceAccountKeySecretArn? }`.
- `compute.ts`: inject the four env vars onto the **iterative step processor**
  Lambda (mirroring the existing `AI_API_KEY_SECRET_ARN` injection); grant
  `secretsmanager:GetSecretValue` on the SA-key secret when present.
- `allma-stack.ts`: light validation — if `gemini.useVertex`, require
  `gcpProjectId` and `gcpLocation`.
- **No VPC/networking change** — Vertex is a public HTTPS Google API.

### 5.4 GCP-side setup (one-time, per environment; manage in Terraform)
1. Project + enable Vertex AI API (`aiplatform.googleapis.com`) + billing.
2. Service account with `roles/aiplatform.user` (least privilege).
3. **Option A:** create + download JSON key → put in AWS Secrets Manager →
   set `serviceAccountKeySecretArn`.
   **Option B:** create Workload Identity Pool + AWS provider, bind the Lambda
   execution-role ARN to impersonate the SA, generate the credential-config file,
   bundle it and set `GOOGLE_APPLICATION_CREDENTIALS`.

## 6. Rollout
1. Land code (flag default **off** → no behavior change).
2. GCP setup; stand up Option A for a dev stage.
3. Update `config.llmModels.*` to Vertex-valid model IDs.
4. Deploy dev, run real `LLM_INVOCATION` flows (JSON mode + media).
5. Stand up WIF (Option B) for prod; flip `gemini.useVertex=true` per stage.
6. Instant rollback = flip the flag back.

## 7. Versioning
New backward-compatible config + env constants + SDK capability → **minor**
changeset bumping `@allma/core-cdk` (it bundles `app-logic`) and
`@allma/core-types`. Not a major (no breaking change; default path unchanged).

## 8. Complexity
**Low–Medium**, ~1–3 days. Code blast radius is tiny (one constructor behind a
flag). The real work is the GCP IAM/WIF setup and model-ID normalization. The
single gating risk to validate early: **one real `generateContent` from a
deployed Lambda via WIF** (the token exchange).
