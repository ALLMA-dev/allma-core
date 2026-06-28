import { z } from 'zod';
import { JsonPathStringSchema } from '../common/core.js';
import { StepTypeSchema } from '../common/enums.js';
import { LlmParametersSchema, LlmParameters } from '../llm/index.js';
import { OnCompletionActionSchema, OnCompletionAction } from './actions.js';
import { StepErrorHandlerSchema, StepErrorHandler } from '../steps/common.js';
import { StepInstanceSchema, StepInstance } from '../steps/definitions.js';

/**
 * Configuration for validating the output of a step.
 */
export const OutputValidationSchema = z.object({
  requiredFields: z.array(JsonPathStringSchema).optional(),
}).optional();
export type OutputValidation = z.infer<typeof OutputValidationSchema>;

/**
 * Configuration for the integrated LLM output security validator.
 */
export const SecurityValidatorConfigSchema = z.object({
  forbiddenStrings: z.array(z.string()).optional(),
  semanticCheck: z.object({
    similarityThreshold: z.number().min(0.8).max(1.0),
  }).optional(),
});
export type SecurityValidatorConfig = z.infer<typeof SecurityValidatorConfigSchema>;

/**
 * Helper for detailed JSONPath validation during flow definition parsing.
 */
const checkJsonPath = (path: (string | number)[], value: any, ctx: z.RefinementCtx) => {
    if (typeof value !== 'string') return;
    const result = JsonPathStringSchema.safeParse(value);
    if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error.errors[0]?.message || 'Invalid JSONPath format.', path });
    }
};

/**
 * Explicit type definition for an immutable version of an Allma flow.
 * This is defined explicitly to prevent TypeScript error TS7056 due to the
 * complexity of the inferred Zod schema type.
 */
export type FlowDefinition = {
    id: string;
    version: number;
    isPublished: boolean;
    steps: Record<string, StepInstance>;
    startStepInstanceId: string;
    enableExecutionLogs?: boolean;
    description?: string | null;
    flowVariables?: Record<string, any>;
    defaultStepConfig?: {
        defaultInferenceParameters?: LlmParameters;
        defaultCustomConfig?: Record<string, any>;
        defaultErrorHandler?: StepErrorHandler;
    } | null;
    onCompletionActions?: OnCompletionAction[];
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    // Accommodate passthrough fields
    [key: string]: any;
};

/**
 * The author-facing shape of a flow: a {@link FlowDefinition} without the
 * server-owned bookkeeping fields (`createdAt`/`updatedAt`/`publishedAt`/
 * `isPublished`). `version` is retained because the importer needs it as the
 * target version slot. This is what a code-authored or hand-written flow emits;
 * the importer stamps the server-owned fields at import time. It is hand-written
 * for the same TS7056 reason as {@link FlowDefinition}.
 */
export type FlowAuthoringFormat = {
    id: string;
    version: number;
    steps: Record<string, StepInstance>;
    startStepInstanceId: string;
    enableExecutionLogs?: boolean;
    description?: string | null;
    flowVariables?: Record<string, any>;
    defaultStepConfig?: {
        defaultInferenceParameters?: LlmParameters;
        defaultCustomConfig?: Record<string, any>;
        defaultErrorHandler?: StepErrorHandler;
    } | null;
    onCompletionActions?: OnCompletionAction[];
    // Accommodate passthrough fields
    [key: string]: any;
};

/**
 * Structural view of the fields the cross-reference refinement reads. Declared
 * explicitly so the refinement can be shared between the full-definition and
 * authoring schemas without re-triggering the TS7056 inference blow-up.
 */
type FlowCrossReferenceTarget = {
  steps: Record<string, StepInstance>;
  startStepInstanceId?: string;
  onCompletionActions?: OnCompletionAction[];
};

/**
 * CROSS-FIELD validation shared by {@link FlowDefinitionSchema} and
 * {@link FlowAuthoringSchema}: the per-step structure is already validated by
 * the object schema, so this only checks references and JSONPath well-formedness.
 */
const validateFlowCrossReferences = (data: FlowCrossReferenceTarget, ctx: z.RefinementCtx): void => {
  if (data.startStepInstanceId && !data.steps[data.startStepInstanceId]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `startStepInstanceId '${data.startStepInstanceId}' does not exist in the steps map.`, path: ["startStepInstanceId"] });
  }

  // The `data.steps` object is now guaranteed by Zod to be a record of valid StepInstances.
  Object.entries(data.steps).forEach(([stepId, step]: [string, StepInstance]) => {
    step.transitions?.forEach((t, i) => {
      if (!data.steps[t.nextStepInstanceId]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Transition target '${t.nextStepInstanceId}' does not exist in this flow.`,
          path: ["steps", stepId, "transitions", i, "nextStepInstanceId"]
        });
      }
    });
    if (step.defaultNextStepInstanceId && !data.steps[step.defaultNextStepInstanceId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultNextStepInstanceId '${step.defaultNextStepInstanceId}' points to a non-existent step.`,
        path: ["steps", stepId, "defaultNextStepInstanceId"]
      });
    }
    if (step.onError?.fallbackStepInstanceId && !data.steps[step.onError.fallbackStepInstanceId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `onError.fallbackStepInstanceId '${step.onError.fallbackStepInstanceId}' points to a non-existent step.`,
        path: ["steps", stepId, "onError", "fallbackStepInstanceId"]
      });
    }
    if (step.stepType === StepTypeSchema.enum.PARALLEL_FORK_MANAGER && step.aggregationConfig?.dataPath) {
        checkJsonPath(['steps', stepId, 'aggregationConfig', 'dataPath'], step.aggregationConfig.dataPath, ctx);
    }
    if (step.inputMappings) Object.entries(step.inputMappings).forEach(([k, v]) => checkJsonPath(['steps', stepId, 'inputMappings', k], v, ctx));
    if (step.outputMappings) Object.entries(step.outputMappings).forEach(([k, v]) => { checkJsonPath(['steps', stepId, 'outputMappings', k], k, ctx); checkJsonPath(['steps', stepId, 'outputMappings', k], v, ctx); });
    if (step.transitions) step.transitions.forEach((t: { condition: string }, i: number) => checkJsonPath(['steps', stepId, 'transitions', i, 'condition'], t.condition, ctx));
  });

  data.onCompletionActions?.forEach((action, index) => {
    if (action.condition) checkJsonPath(['onCompletionActions', index, 'condition'], action.condition, ctx);
    if (action.payloadTemplate) Object.entries(action.payloadTemplate).forEach(([k, v]) => checkJsonPath(['onCompletionActions', index, 'payloadTemplate', k], v, ctx));
    if (action.actionType === 'SNS_SEND' && action.messageAttributesTemplate) Object.entries(action.messageAttributesTemplate).forEach(([k, v]) => checkJsonPath(['onCompletionActions', index, 'messageAttributesTemplate', k], v, ctx));
  });
};

/**
 * The object shape shared by the full-definition and authoring schemas. Kept
 * private (and un-exported) so its heavy inferred type is never serialized into
 * a `.d.ts`; the public schemas below are cast to their hand-written types.
 */
const FlowDefinitionObjectSchema = z.object({
  id: z.string().min(1, "Flow definition ID is required."),
  version: z.number().int().positive({ message: "Version must be a positive integer." }),
  isPublished: z.boolean().default(false),
  steps: z.record(z.string().min(1), StepInstanceSchema),
  startStepInstanceId: z.string().min(1, "Start step instance ID is required."),
  enableExecutionLogs: z.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  flowVariables: z.record(z.any()).optional().default({}),
  defaultStepConfig: z.object({
    defaultInferenceParameters: LlmParametersSchema.optional(),
    defaultCustomConfig: z.record(z.any()).optional(),
    defaultErrorHandler: StepErrorHandlerSchema.optional(),
  }).optional().nullable(),
  onCompletionActions: z.array(OnCompletionActionSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable().optional(),
});

/**
 * Defines an immutable version of an Allma flow.
 * It is cast to `z.ZodType<FlowDefinition>` to use the explicit type and
 * prevent TypeScript's inference chain from exceeding serialization limits.
 */
export const FlowDefinitionSchema = FlowDefinitionObjectSchema
  .passthrough()
  // The runtime shape matches `FlowCrossReferenceTarget`; cast through `unknown`
  // to share the refinement without forcing TS to serialize the inferred type.
  .superRefine((data, ctx) => validateFlowCrossReferences(data as unknown as FlowCrossReferenceTarget, ctx)) as z.ZodType<FlowDefinition>;

/**
 * The authoring schema: {@link FlowDefinitionSchema} without the server-owned
 * fields (`createdAt`/`updatedAt`/`publishedAt`/`isPublished`), with `version`
 * defaulting to `1`. Hand-authored and code-generated flows are validated
 * against this; the importer stamps the omitted server-owned fields. Inherits
 * the same cross-reference and JSONPath validation as the full schema.
 */
export const FlowAuthoringSchema = FlowDefinitionObjectSchema
  .omit({ createdAt: true, updatedAt: true, publishedAt: true, isPublished: true })
  .extend({ version: z.number().int().positive({ message: "Version must be a positive integer." }).default(1) })
  .passthrough()
  .superRefine((data, ctx) => validateFlowCrossReferences(data as unknown as FlowCrossReferenceTarget, ctx)) as z.ZodType<FlowAuthoringFormat>;

/**
 * Fills in the server-owned bookkeeping fields that an authoring-format flow
 * omits (`createdAt`/`updatedAt`) and defaults `version` to `1`, so a flow
 * authored without those fields validates and imports cleanly. Existing values
 * are always preserved, so a full {@link FlowDefinition} passes through
 * unchanged — keeping import fully backward compatible. Mirrors the way the
 * importer strips/stamps `createdAt`/`updatedAt` for connections and agents.
 *
 * @param flow The raw, unparsed flow object (authoring or full format).
 * @param nowIso The ISO-8601 timestamp to stamp when a field is missing.
 */
export function applyFlowImportDefaults(
  flow: Record<string, unknown>,
  nowIso: string,
): Record<string, unknown> {
  return {
    ...flow,
    version: typeof flow.version === 'number' ? flow.version : 1,
    createdAt: typeof flow.createdAt === 'string' ? flow.createdAt : nowIso,
    updatedAt: typeof flow.updatedAt === 'string' ? flow.updatedAt : nowIso,
  };
}