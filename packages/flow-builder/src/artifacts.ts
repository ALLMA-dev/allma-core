import { z } from 'zod';
import {
  PromptTemplateSchema,
  McpConnectionSchema,
  StepDefinitionSchema,
} from '@allma/core-types';
import type { AllmaExportFormat, PromptTemplate, McpConnection, StepDefinition } from '@allma/core-types';
import { Step, type StepDraft } from './step.js';
import {
  ArtifactBuildError,
  checkModuleCustomConfig,
  checkStepPayload,
  collectSchemaIssues,
} from './validate.js';
import { STABLE_EXPORTED_AT } from './define-flow.js';
import type { PromptRef, StepDefRef, McpConnectionRef } from './refs.js';

/**
 * Config-as-code authoring of the cross-artifact entities a flow references —
 * prompt templates, reusable step definitions, and MCP connections (RFC §11).
 * Each `define*` mirrors `defineFlow`'s contract: lazy, two-phase-friendly
 * (the `id` is available immediately so a flow can reference the handle before
 * `build()` runs), a strict build-time gate (a `.strict()` clone catches unknown
 * keys the persisted `.passthrough()`/`.and()` schemas would allow), and a
 * deterministic emit.
 *
 * ### Why these artifacts carry a fixed timestamp
 * Unlike flows — which the importer stamps with real `createdAt`/`updatedAt` and
 * whose `FlowAuthoringSchema` omits them — the deploy validator
 * (`validateAllmaConfig`) parses prompts/step-defs/MCP connections **directly**
 * against schemas that **require** `createdAt`/`updatedAt`. To stay both
 * deploy-valid and byte-stable for the §8 drift check, the builder emits the
 * deterministic placeholder {@link STABLE_EXPORTED_AT}. The server overwrites it
 * on import (MCP connections are stripped; prompt timestamps are stamped by the
 * versioned entity manager), so the placeholder never carries semantic meaning.
 */

/** The deterministic placeholder stamped into authoring-time `createdAt`/`updatedAt`. */
export const STABLE_TIMESTAMP = STABLE_EXPORTED_AT;

/** Common shape every code-authored artifact exposes (a typed handle + emitters). */
export interface DefinedArtifact {
  readonly id: string;
  readonly kind: 'prompt' | 'stepDefinition' | 'mcpConnection';
  toExport(exportedAt?: string): AllmaExportFormat;
}

// --- Prompt templates ----------------------------------------------------------

const PROMPT_SERVER_FIELDS = {
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
} as const;

/** The author-facing prompt-template schema (server-owned fields removed). */
const PromptAuthoringSchema = PromptTemplateSchema.omit(PROMPT_SERVER_FIELDS);

/** Input accepted by {@link definePrompt} — a prompt template minus server fields. */
export type PromptInput = z.input<typeof PromptAuthoringSchema>;

/** A prompt template authored in code: a typed {@link PromptRef} plus emitters. */
export interface DefinedPrompt extends PromptRef, DefinedArtifact {
  readonly kind: 'prompt';
  /** Strict authoring gate → the deterministic, deploy-valid `PromptTemplate`. */
  build(): PromptTemplate;
}

/** Authors a reusable prompt template in code. */
export function definePrompt(spec: PromptInput): DefinedPrompt {
  const id = spec.id;
  const build = (): PromptTemplate => {
    const result = PromptAuthoringSchema.strict().safeParse(spec);
    if (!result.success) {
      throw new ArtifactBuildError('Prompt', id, formatIssues(result.error, id, 'prompt'));
    }
    return { ...result.data, createdAt: STABLE_TIMESTAMP, updatedAt: STABLE_TIMESTAMP } as PromptTemplate;
  };
  return {
    id,
    kind: 'prompt',
    build,
    toExport: (exportedAt = STABLE_EXPORTED_AT): AllmaExportFormat =>
      ({ formatVersion: '1.0', exportedAt, promptTemplates: [build()] }) as unknown as AllmaExportFormat,
  };
}

// --- MCP connections -----------------------------------------------------------

const McpAuthoringSchema = McpConnectionSchema.omit({ createdAt: true, updatedAt: true });

/** Input accepted by {@link defineMcpConnection} — an MCP connection minus timestamps. */
export type McpConnectionInput = z.input<typeof McpAuthoringSchema>;

/** An MCP connection authored in code: a typed {@link McpConnectionRef} plus emitters. */
export interface DefinedMcpConnection extends McpConnectionRef, DefinedArtifact {
  readonly kind: 'mcpConnection';
  /** Strict authoring gate → the deterministic, deploy-valid `McpConnection`. */
  build(): McpConnection;
}

/** Authors a reusable MCP connection in code. */
export function defineMcpConnection(spec: McpConnectionInput): DefinedMcpConnection {
  const id = spec.id;
  const build = (): McpConnection => {
    const result = McpAuthoringSchema.strict().safeParse(spec);
    if (!result.success) {
      throw new ArtifactBuildError('MCP connection', id, formatIssues(result.error, id, 'mcpConnection'));
    }
    return { ...result.data, createdAt: STABLE_TIMESTAMP, updatedAt: STABLE_TIMESTAMP } as McpConnection;
  };
  return {
    id,
    kind: 'mcpConnection',
    build,
    toExport: (exportedAt = STABLE_EXPORTED_AT): AllmaExportFormat =>
      ({ formatVersion: '1.0', exportedAt, mcpConnections: [build()] }) as unknown as AllmaExportFormat,
  };
}

// --- Step definitions ----------------------------------------------------------

/** Metadata for a reusable step definition (the payload comes from a {@link StepDraft}). */
export interface StepDefinitionMeta {
  /** Stable step-definition id (the `stepDefinitionId` a step references). */
  id: string;
  /** Human-friendly name. */
  name: string;
  /** Optional description. */
  description?: string | null;
  /** Target version slot for the importer. Defaults to `1`. */
  version?: number;
}

/** A reusable step definition authored in code: a typed {@link StepDefRef} plus emitters. */
export interface DefinedStepDefinition extends StepDefRef, DefinedArtifact {
  readonly kind: 'stepDefinition';
  /** Strict authoring gate → the deterministic, deploy-valid `StepDefinition`. */
  build(): StepDefinition;
}

/**
 * Authors a reusable step definition from a typed step draft. The payload reuses
 * the exact same typed factories as a flow step (`llmInvocation(...)`,
 * `s3DataLoad(...)`, …), so a step definition gets the same per-leaf type safety
 * and the same registry-driven `customConfig` validation.
 *
 * @example
 *   export default defineStep(
 *     { id: 'summarize-doc', name: 'Summarize document' },
 *     llmInvocation({ llmProvider: 'BEDROCK', modelId: 'anthropic.claude-...' }),
 *   );
 */
export function defineStep(meta: StepDefinitionMeta, draft: StepDraft): DefinedStepDefinition {
  const build = (): StepDefinition => {
    const step = draft as Step;
    const stepType = step._getStepType();
    const payload = step._getPayload();
    const issues: string[] = [];

    // Per-leaf strict gate + registry customConfig parse (the "stricter than
    // deploy" guarantee, shared with flow steps).
    issues.push(...checkStepPayload(meta.id, stepType, payload));
    issues.push(
      ...checkModuleCustomConfig(meta.id, payload.moduleIdentifier as string | undefined, payload.customConfig),
    );

    let body: Record<string, unknown> = { stepType, ...payload };
    try {
      body = step._toDefinitionBody();
    } catch (error) {
      issues.push(`step definition '${meta.id}': ${error instanceof Error ? error.message : String(error)}`);
    }

    const obj: Record<string, unknown> = {
      id: meta.id,
      name: meta.name,
      version: meta.version ?? 1,
      ...(meta.description !== undefined && meta.description !== null ? { description: meta.description } : {}),
      ...body,
      createdAt: STABLE_TIMESTAMP,
      updatedAt: STABLE_TIMESTAMP,
    };

    // Full-schema gate: id/name/cross-field refinement (e.g. system id↔module match).
    issues.push(...collectSchemaIssues(StepDefinitionSchema, obj, `stepDefinition '${meta.id}'`));

    if (issues.length > 0) throw new ArtifactBuildError('Step definition', meta.id, issues);
    return obj as unknown as StepDefinition;
  };

  return {
    id: meta.id,
    kind: 'stepDefinition',
    build,
    toExport: (exportedAt = STABLE_EXPORTED_AT): AllmaExportFormat =>
      ({ formatVersion: '1.0', exportedAt, stepDefinitions: [build()] }) as unknown as AllmaExportFormat,
  };
}

/** Renders a Zod error into prefixed issue strings (mirrors validate.ts internals). */
function formatIssues(error: z.ZodError, id: string, kind: string): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    const prefix = `${kind} '${id}'`;
    return path ? `${prefix} ${path}: ${issue.message}` : `${prefix}: ${issue.message}`;
  });
}
