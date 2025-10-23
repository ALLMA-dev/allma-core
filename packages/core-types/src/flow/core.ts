import { z } from 'zod';
import { JsonPathStringSchema } from '../common/core.js';
import { StepTypeSchema } from '../common/enums.js';
import { LlmParametersSchema } from '../llm/index.js';
import { OnCompletionActionSchema } from './actions.js';
import { StepErrorHandlerSchema } from '../steps/common.js';
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
 * Defines an immutable version of an Allma flow.
 */
export const FlowDefinitionSchema = z.object({
  id: z.string().min(1, "Flow definition ID is required."),
  version: z.number().int().positive({ message: "Version must be a positive integer." }),
  isPublished: z.boolean().default(false),
  steps: z.record(z.string().min(1), StepInstanceSchema),
  startStepInstanceId: z.string().min(1, "Start step instance ID is required."),
  enableExecutionLogs: z.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  defaultStepConfig: z.object({
    defaultInferenceParameters: LlmParametersSchema.optional(),
    defaultCustomConfig: z.record(z.any()).optional(),
    defaultErrorHandler: StepErrorHandlerSchema.optional(),
  }).optional().nullable(),
  onCompletionActions: z.array(OnCompletionActionSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable().optional(),
})
.passthrough()
.superRefine((data, ctx) => {
  if (data.startStepInstanceId && !data.steps[data.startStepInstanceId]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `startStepInstanceId '${data.startStepInstanceId}' does not exist in the steps map.`, path: ["startStepInstanceId"] });
  }
  Object.entries(data.steps).forEach(([stepId, step]: [string, StepInstance]) => {
    step.transitions?.forEach((t: { condition: string; nextStepInstanceId: string; }) => { if (!data.steps[t.nextStepInstanceId]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Transition in step '${stepId}' points to non-existent step '${t.nextStepInstanceId}'.`, path: ["steps", stepId, "transitions"] }); });
    if (step.defaultNextStepInstanceId && !data.steps[step.defaultNextStepInstanceId]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `defaultNextStepInstanceId in step '${stepId}' points to non-existent step '${step.defaultNextStepInstanceId}'.`, path: ["steps", stepId, "defaultNextStepInstanceId"] });
    if (step.onError?.fallbackStepInstanceId && !data.steps[step.onError.fallbackStepInstanceId]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `onError.fallbackStepInstanceId in step '${stepId}' points to non-existent step '${step.onError.fallbackStepInstanceId}'.`, path: ["steps", stepId, "onError", "fallbackStepInstanceId"] });
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
});
export type FlowDefinition = z.infer<typeof FlowDefinitionSchema>;