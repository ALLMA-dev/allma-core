import { z } from 'zod';
import { S3PointerSchema, AllmaErrorSchema } from '../common/core.js';
import { SfnActionTypeSchema } from '../common/enums.js';
import { StepInstanceSchema } from '../steps/definitions.js';
import { AggregationConfigSchema, BranchResultSchema, BranchExecutionPayloadSchema, BranchDefinitionSchema } from '../flow/branching.js';

/**
 * Defines a map of overrides for specific step instances within a flow run.
 */
export const FlowStepOverridesSchema = z.record(z.string(), z.record(z.any()));
export type FlowStepOverrides = z.infer<typeof FlowStepOverridesSchema>;

/**
 * Represents the runtime state of a single execution of an Allma flow.
 */
export const FlowRuntimeStateSchema: z.ZodType<any> = z.object({
  flowDefinitionId: z.string().min(1),
  flowDefinitionVersion: z.number().int().positive(),
  flowExecutionId: z.string().uuid(),
  enableExecutionLogs: z.boolean(),
  branchId: z.string().optional(),
  branchExecutionId: z.string().optional(),
  currentStepInstanceId: z.string().min(1).optional(),
  status: z.enum(['INITIALIZING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  currentContextData: z.record(z.any()),
  currentContextDataS3Pointer: S3PointerSchema.optional(),
  errorInfo: AllmaErrorSchema.optional(),
  stepRetryAttempts: z.record(z.string(), z.number().int().min(0)).optional().default({}),
  executionOverrides: z.object({
    stepOverrides: FlowStepOverridesSchema.optional(),
  }).optional(),
  _internal: z.object({
    loadedFlowDefinitionS3Pointer: S3PointerSchema.optional(),
    lastHeartbeat: z.string().datetime({ precision: 3, offset: true }).optional(),
    currentStepStartTime: z.string().datetime({ precision: 3, offset: true }).optional(),
    currentStepHandlerResult: z.any().optional(),
    stepInstanceConfig: StepInstanceSchema.optional(),
    originalStartInput: z.lazy(() => StartFlowExecutionInputSchema).optional(),
    loggingBootstrapped: z.boolean().optional(),
  }).passthrough().optional(),
});
export type FlowRuntimeState = z.infer<typeof FlowRuntimeStateSchema>;

/**
 * Input payload for starting an Allma flow execution.
 */
export const StartFlowExecutionInputSchema = z.object({
  flowDefinitionId: z.string().min(1),
  flowVersion: z.union([z.string(), z.literal('LATEST_PUBLISHED')]).optional().default('LATEST_PUBLISHED'),
  initialContextData: z.record(z.any()).optional().default({}),
  flowExecutionId: z.string().uuid().optional(),
  triggerSource: z.string().optional(),
  enableExecutionLogs: z.boolean().optional(),
  executionOverrides: z.object({
    stepOverrides: FlowStepOverridesSchema.optional(),
    startFromState: z.lazy((): typeof FlowRuntimeStateSchema => FlowRuntimeStateSchema).optional(),
  }).optional(),
});
export type StartFlowExecutionInput = z.infer<typeof StartFlowExecutionInputSchema>;


/**
 * Input to the IterativeStepProcessorLambda.
 */
export const ProcessorInputSchema = z.object({
  runtimeState: FlowRuntimeStateSchema,
  sfnAction: SfnActionTypeSchema.optional(),
  taskToken: z.string().optional(),
  resumePayload: z.any().optional(),
  pollingResult: z.object({ Output: z.string() }).passthrough().optional(),
  parallelAggregateInput: z.object({
      branchOutputs: z.array(BranchResultSchema),
      aggregationConfig: AggregationConfigSchema.optional(),
      originalStepInstanceId: z.string(),
  }).optional(),
});
export type ProcessorInput = z.infer<typeof ProcessorInputSchema>;

/**
 * Output from the IterativeStepProcessorLambda.
 */
export const ProcessorOutputSchema = z.object({
  runtimeState: FlowRuntimeStateSchema,
  sfnAction: SfnActionTypeSchema,
  pollingTaskInput: z.any().optional(),
  parallelForkInput: z.object({
      branchesToExecute: z.array(BranchExecutionPayloadSchema),
      aggregationConfig: AggregationConfigSchema.optional(),
      originalStepInstanceId: z.string(),
  }).optional(),
  s3ItemReader: z.object({
    bucket: z.string(),
    key: z.string(),
    parallelBranches: z.array(BranchDefinitionSchema),
    aggregationConfig: AggregationConfigSchema.optional(),
    originalStepInstanceId: z.string(),
  }).optional(),
});
export type ProcessorOutput = z.infer<typeof ProcessorOutputSchema>;