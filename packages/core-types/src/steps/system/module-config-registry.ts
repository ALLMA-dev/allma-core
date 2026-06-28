import { z } from 'zod';
import { StepType } from '../../common/enums.js';
import { SystemModuleIdentifiers, type SystemModuleIdentifier } from '../system-module-identifiers.js';
import { S3DataLoaderCustomConfigSchema } from './s3-loader.js';
import { S3DataSaverCustomConfigSchema } from './s3-saver.js';
import { DynamoDBLoaderCustomConfigSchema } from './dynamodb-loader.js';

/**
 * The step types whose configuration is carried in a free-form `customConfig`
 * object addressed by a `moduleIdentifier`, rather than in a dedicated typed
 * payload. These are the only step types the module-config registry concerns
 * itself with; every other `StepType` is a typed-payload step validated by its
 * own schema in the `StepPayloadUnionSchema` discriminated union.
 */
export const MODULE_CONFIG_STEP_TYPES = [
  StepType.DATA_LOAD,
  StepType.DATA_SAVE,
  StepType.DATA_TRANSFORMATION,
  StepType.CUSTOM_LOGIC,
] as const;

/**
 * The canonical map from a system `moduleIdentifier` to the Zod schema that
 * describes its `customConfig`. This centralizes the schemas that the runtime
 * step handlers already own so that the importer, the admin save API, the
 * Visual Editor, and (future) the flow builder can all validate `customConfig`
 * from a single source of truth instead of re-discovering it.
 *
 * Only modules whose config schema is defined in `@allma/core-types` appear
 * here. Several system modules still validate their config with a schema
 * defined privately inside `allma-app-logic` (which `@allma/core-types` cannot
 * import). Those are intentionally **not** registered yet and are enumerated in
 * {@link SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA}; centralizing them is a follow-up.
 */
export const SYSTEM_MODULE_CONFIG_SCHEMAS = {
  [SystemModuleIdentifiers.S3_DATA_LOADER]: S3DataLoaderCustomConfigSchema,
  [SystemModuleIdentifiers.DYNAMODB_DATA_LOADER]: DynamoDBLoaderCustomConfigSchema,
  [SystemModuleIdentifiers.S3_DATA_SAVER]: S3DataSaverCustomConfigSchema,
} satisfies Partial<Record<SystemModuleIdentifier, z.ZodTypeAny>>;

/**
 * System modules used by a module-config step type whose `customConfig` schema
 * is **not yet centralized** in `@allma/core-types` (it currently lives inside
 * `allma-app-logic`). Listing them explicitly keeps them opaque to the registry
 * validator while making the completeness test meaningful: a newly added system
 * module (or step type) that is neither registered in
 * {@link SYSTEM_MODULE_CONFIG_SCHEMAS} nor acknowledged here fails CI, forcing a
 * deliberate decision rather than silently skipping validation.
 */
export const SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA: readonly SystemModuleIdentifier[] = [
  SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST,
  SystemModuleIdentifiers.S3_LIST_FILES,
  SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES,
  SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES,
  SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE,
  SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM,
  SystemModuleIdentifiers.ARRAY_AGGREGATOR,
  SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT,
  SystemModuleIdentifiers.DATE_TIME_CALCULATOR,
  SystemModuleIdentifiers.FLATTEN_ARRAY,
  SystemModuleIdentifiers.GENERATE_ARRAY,
  SystemModuleIdentifiers.JOIN_DATA,
  SystemModuleIdentifiers.GENERATE_UUID,
];

/**
 * Returns the registered `customConfig` schema for a system `moduleIdentifier`,
 * or `undefined` when the module is unknown, consumer-defined, or one of the
 * not-yet-centralized system modules. Callers must treat `undefined` as
 * "opaque — do not validate", never as an error.
 */
export function getSystemModuleConfigSchema(
  moduleIdentifier: string | undefined | null,
): z.ZodTypeAny | undefined {
  if (!moduleIdentifier) return undefined;
  return (SYSTEM_MODULE_CONFIG_SCHEMAS as Record<string, z.ZodTypeAny>)[moduleIdentifier];
}

/** A single registry-validation problem found in a step's `customConfig`. */
export interface CustomConfigIssue {
  /** Dotted path to the offending field within `customConfig`. */
  path: string;
  /** Human-readable description of the problem. */
  message: string;
}

/** Structured, non-fatal warning describing a step whose `customConfig` failed registry validation. */
export interface CustomConfigWarning {
  stepInstanceId: string;
  moduleIdentifier: string;
  issues: CustomConfigIssue[];
}

/** Minimal structural view of a step needed to lint its `customConfig`. */
interface LintableStep {
  stepInstanceId?: string;
  moduleIdentifier?: string | null;
  customConfig?: unknown;
}

/** Minimal structural view of a flow needed to lint its steps' `customConfig`. */
interface LintableFlow {
  steps?: Record<string, LintableStep> | null;
}

/**
 * Lints every step's `customConfig` against the module-config registry and
 * returns structured warnings — it never throws. Steps are skipped (treated as
 * opaque) when they have no `customConfig`, no `moduleIdentifier`, or a module
 * with no registered schema (unknown/consumer-defined or not-yet-centralized).
 *
 * This is a **warn-mode** pass: a missing field may legitimately be supplied at
 * runtime via `inputMappings`, so a warning here is advisory, not proof of a
 * broken flow. It is deliberately decoupled from `FlowDefinitionSchema`, which
 * does not (yet) hard-fail on `customConfig`.
 */
export function collectCustomConfigWarnings(flow: LintableFlow | null | undefined): CustomConfigWarning[] {
  const warnings: CustomConfigWarning[] = [];
  if (!flow?.steps) return warnings;

  for (const [stepId, step] of Object.entries(flow.steps)) {
    if (!step || step.customConfig === undefined || step.customConfig === null) continue;
    const schema = getSystemModuleConfigSchema(step.moduleIdentifier);
    if (!schema) continue; // opaque module — never warn

    const result = schema.safeParse(step.customConfig);
    if (!result.success) {
      warnings.push({
        stepInstanceId: step.stepInstanceId ?? stepId,
        moduleIdentifier: step.moduleIdentifier as string,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
  }

  return warnings;
}
