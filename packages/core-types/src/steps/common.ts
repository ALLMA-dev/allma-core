import { z } from 'zod';
import { JsonPathStringSchema } from '../common/core.js';
// import { FlowRuntimeState } from '../runtime/core.js';

/**
 * Unique identifier for a reusable Step Definition.
 */
export const StepDefinitionIdSchema = z.string().min(1, "Step definition ID reference is required.");
export type StepDefinitionId = z.infer<typeof StepDefinitionIdSchema>;

/**
 * Defines how to map data from the flow's context into a step's input.
 * The key is a dot-notation path on the target input object, and the value is a JSONPath
 * string to extract data from the source context.
 */
export const StepInputMappingSchema = z.record(
  z.string().min(1, "Input mapping key (a dot-notation path) cannot be empty."),
  JsonPathStringSchema
);
export type StepInputMapping = z.infer<typeof StepInputMappingSchema>;

/**
 * Defines how to map data from a step's output back into the flow's context.
 * The key is a JSONPath string for the target location in the context, and the value is
 * a JSONPath string to extract data from the step's output.
 */
export const StepOutputMappingSchema = z.record(
  JsonPathStringSchema,
  JsonPathStringSchema
);
export type StepOutputMapping = z.infer<typeof StepOutputMappingSchema>;

/**
 * Configuration for handling errors during a step's execution, including retries and fallbacks.
 */
export const StepErrorHandlerSchema = z.object({
  retries: z.object({
    count: z.number().int().min(0).max(5).default(0),
    intervalSeconds: z.number().int().min(1).max(300).default(5),
    backoffRate: z.number().min(1.0).max(5.0).default(2.0),
    errorEquals: z.array(z.string()).optional(),
  }).optional(),
  retryOnContentError: z.object({
    count: z.number().int().min(1).max(5).default(1),
    intervalSeconds: z.number().int().min(1).max(300).default(5),
    backoffRate: z.number().min(1.0).max(5.0).default(2.0),
  }).optional(),
  fallbackStepInstanceId: z.string().min(1).optional(),
  continueOnFailure: z.boolean().optional().default(false),
});
export type StepErrorHandler = z.infer<typeof StepErrorHandlerSchema>;
