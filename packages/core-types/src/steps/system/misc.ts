import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { JsonPathStringSchema } from '../../common/core.js';
import { BranchDefinitionSchema, AggregationConfigSchema } from '../../flow/branching.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the payload for a simple NO_OP (No Operation) step.
 */
export const NoOpStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.NO_OP),
  moduleIdentifier: z.undefined().optional(),
}).passthrough();

/**
 * Defines the payload for an END_FLOW step, which terminates the current execution path.
 */
export const EndFlowStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.END_FLOW),
  moduleIdentifier: z.undefined().optional(),
}).passthrough();

/**
 * Defines the payload for a step that executes custom business logic.
 */
export const CustomLogicStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.CUSTOM_LOGIC),
  moduleIdentifier: z.string({ required_error: 'moduleIdentifier is required for CUSTOM_LOGIC steps' }).min(1, 'moduleIdentifier cannot be empty for CUSTOM_LOGIC steps'),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a step that invokes a custom Lambda function.
 */
export const CustomLambdaInvokeStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.CUSTOM_LAMBDA_INVOKE),
  moduleIdentifier: z.undefined().optional(),
  lambdaFunctionArnTemplate: z.string().min(1).describe("Lambda Function ARN|text|ARN of the function to invoke. Supports templates."),
  payloadTemplate: z.record(z.string()).optional().describe("Payload Template|json|Map context data to the Lambda's input payload."),
  // MODIFIED: Add customConfig to allow for the new hydration flag.
  customConfig: z.object({
    hydrateInputFromS3: z.boolean().optional().describe("If true, automatically resolve S3 pointers in the step's input before invoking the Lambda."),
  }).passthrough().optional(),
}).passthrough();

/**
 * Defines the payload for a PARALLEL_FORK_MANAGER step.
 * This step's primary purpose is to define branches for parallel execution.
 */
export const ParallelForkManagerStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.PARALLEL_FORK_MANAGER),
    moduleIdentifier: z.undefined().optional(),
    itemsPath: JsonPathStringSchema.optional().describe("Items Path|text|For parallel steps, JSONPath to an array in the context to iterate over."),
    parallelBranches: z.array(BranchDefinitionSchema).optional().describe("Branches|json|Configuration for each parallel branch of execution."),
    aggregationConfig: AggregationConfigSchema.optional().describe("Aggregation|json|Configuration for how to combine results from branches."),
}).passthrough();

/**
 * Defines the payload for a DATA_LOAD step, which uses a specific module to fetch data.
 */
export const DataLoadStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.DATA_LOAD),
  moduleIdentifier: z.string({ required_error: 'moduleIdentifier is required for DATA_LOAD steps' }).min(1, 'moduleIdentifier cannot be empty for DATA_LOAD steps'),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a DATA_SAVE step, which uses a specific module to save data.
 */
export const DataSaveStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.DATA_SAVE),
  moduleIdentifier: z.string({ required_error: 'moduleIdentifier is required for DATA_SAVE steps' }).min(1, 'moduleIdentifier cannot be empty for DATA_SAVE steps'),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a START_FLOW_EXECUTION step.
 */
export const StartFlowExecutionStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.START_FLOW_EXECUTION),
  moduleIdentifier: z.literal(SystemModuleIdentifiers.START_FLOW_EXECUTION),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();


/**
 * Defines the payload for a DATA_TRANSFORMATION step.
 */
export const DataTransformationStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.DATA_TRANSFORMATION),
  moduleIdentifier: z.string().optional(),
  customConfig: z.object({
    language: z.enum(["javascript", "jsonata", "python_inline"]).optional(),
    script: z.string().optional(),
  }).passthrough().optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();