import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';

/**
 * Defines the payload for a simple NO_OP (No Operation) step.
 */
export const NoOpStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.NO_OP),
}).passthrough();

/**
 * Defines the payload for an END_FLOW step, which terminates the current execution path.
 */
export const EndFlowStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.END_FLOW),
}).passthrough();

/**
 * Defines the payload for a step that executes custom business logic.
 */
export const CustomLogicStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.CUSTOM_LOGIC),
  moduleIdentifier: z.string().optional(),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a step that invokes a custom Lambda function.
 */
export const CustomLambdaInvokeStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.CUSTOM_LAMBDA_INVOKE),
  moduleIdentifier: z.string().optional(),
  lambdaFunctionArnTemplate: z.string().min(1).describe("Lambda Function ARN|text|ARN of the function to invoke. Supports templates."),
  payloadTemplate: z.record(z.string()).optional().describe("Payload Template|json|Map context data to the Lambda's input payload."),
}).passthrough();

/**
 * Defines the payload for a PARALLEL_FORK_MANAGER step.
 * This step's primary purpose is to define branches for parallel execution.
 */
export const ParallelForkManagerStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.PARALLEL_FORK_MANAGER),
}).passthrough();

/**
 * Defines the payload for a DATA_LOAD step, which uses a specific module to fetch data.
 */
export const DataLoadStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.DATA_LOAD),
  moduleIdentifier: z.string().optional(),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a DATA_SAVE step, which uses a specific module to save data.
 */
export const DataSaveStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.DATA_SAVE),
  moduleIdentifier: z.string().optional(),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a MESSAGING step, which uses a module to send a message.
 */
export const MessagingStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.MESSAGING),
  moduleIdentifier: z.string().optional(),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();

/**
 * Defines the payload for a START_FLOW_EXECUTION step.
 */
export const StartFlowExecutionStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.START_FLOW_EXECUTION),
  moduleIdentifier: z.string().optional(),
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