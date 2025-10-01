import { z } from 'zod';
import { AllmaErrorSchema, S3PointerSchema } from '../common/core.js';
import { StartFlowExecutionInputSchema } from '../runtime/core.js';
import { StepInstanceSchema } from '../steps/definitions.js';
import { MappingEventSchema, TransitionEvaluationEventSchema } from './events.js';

export const ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD = 'ALLMA_FLOW_EXECUTION_RECORD' as const;
export const ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD = 'ALLMA_STEP_EXECUTION_RECORD' as const;
export const METADATA_SK_VALUE = 'METADATA';

/**
 * Schema for the main "header" record of a flow execution, stored in DynamoDB.
 */
export const AllmaFlowExecutionRecordSchema = z.object({
  flowExecutionId: z.string().uuid(),
  eventTimestamp_stepInstanceId_attempt: z.literal(METADATA_SK_VALUE),
  itemType: z.literal(ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD),
  flowDefinitionId: z.string(),
  flowDefinitionVersion: z.number().int().positive(),
  status: z.enum(['INITIALIZING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  startTime: z.string().datetime({ precision: 3, offset: true }),
  endTime: z.string().datetime({ precision: 3, offset: true }).optional(),
  initialInputPayload: StartFlowExecutionInputSchema,
  triggerSource: z.string().optional(),
  enableExecutionLogs: z.boolean(),
  finalContextDataS3Pointer: S3PointerSchema.optional(),
  errorInfo: AllmaErrorSchema.optional(),
  ttl: z.number().int().optional(),
  overallStatus: z.string().optional(),
  overallStartTime: z.string().datetime().optional(),
  flow_sort_key: z.string().optional(),
});
export type AllmaFlowExecutionRecord = z.infer<typeof AllmaFlowExecutionRecordSchema>;

/**
 * Schema for the minimal step execution record stored in DynamoDB.
 * This record contains only queryable fields and a pointer to the full details in S3.
 */
export const AllmaStepExecutionRecordSchema = z.object({
  flowExecutionId: z.string().uuid(),
  eventTimestamp_stepInstanceId_attempt: z.string().regex(/^STEP#\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#.+$/),
  itemType: z.literal(ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD),
  eventTimestamp: z.string().datetime({ precision: 3, offset: true }),
  stepInstanceId: z.string(),
  stepDefinitionId: z.string(),
  stepDefinitionVersion: z.number().int().positive().optional(),
  stepType: z.string(),
  branchId: z.string().optional(),
  branchExecutionId: z.string().optional(),
  status: z.enum(['STARTED', 'COMPLETED', 'FAILED', 'RETRYING_SFN', 'RETRYING_CONTENT', 'SKIPPED']),
  startTime: z.string().datetime({ precision: 3, offset: true }),
  endTime: z.string().datetime({ precision: 3, offset: true }).optional(),
  durationMs: z.number().int().optional(),
  attemptNumber: z.number().int().min(1).optional(),
  errorInfoSummary: z.object({ errorName: z.string(), errorMessage: z.string() }).optional(),
  fullRecordS3Pointer: S3PointerSchema,
  ttl: z.number().int().optional(),
}).passthrough(); 
export type AllmaStepExecutionRecord = z.infer<typeof AllmaStepExecutionRecordSchema>;

/**
 * Schema for the full step execution record stored in S3, containing rich detail.
 */
export const FullLogStepExecutionRecordSchema = z.object({
    flowExecutionId: z.string().uuid(),
    branchId: z.string().optional(),
    branchExecutionId: z.string().optional(),
    eventTimestamp: z.string().datetime({ precision: 3, offset: true }),
    stepInstanceId: z.string(),
    stepDefinitionId: z.string(),
    stepDefinitionVersion: z.number().int().positive().optional(),
    stepType: z.string(),
    status: z.enum(['STARTED', 'COMPLETED', 'FAILED', 'RETRYING_SFN', 'RETRYING_CONTENT', 'SKIPPED']),
    startTime: z.string().datetime({ precision: 3, offset: true }),
    endTime: z.string().datetime({ precision: 3, offset: true }).optional(),
    durationMs: z.number().int().optional(),
    attemptNumber: z.number().int().min(1).optional(),
    inputMappingResult: z.record(z.any()).nullable().optional(),
    outputData: z.record(z.any()).nullable().optional(),
    errorInfo: AllmaErrorSchema.optional(),
    mappingEvents: z.array(MappingEventSchema).optional(),
    inputMappingContext: z.record(z.any()).nullable().optional(),
    outputMappingContext: z.record(z.any()).nullable().optional(),
    templateContextMappingContext: z.record(z.any()).nullable().optional(),
    stepInstanceConfig: StepInstanceSchema.optional(),
    logDetails: z.object({
      tokenUsage: z.object({ inputTokens: z.number().int().optional(), outputTokens: z.number().int().optional() }).optional(),
      llmPrompt: z.string().optional(),
      llmRawResponse: z.string().optional(),
      templateContextMappingResult: z.record(z.any()).nullable().optional(),
      transitionEvaluation: TransitionEvaluationEventSchema.optional(),
    }).passthrough().optional(),
});
export type LogStepExecutionRecord = z.infer<typeof FullLogStepExecutionRecordSchema>;

/**
 * Schema for the minimal record passed from the client to the logger lambda.
 */
export const MinimalLogStepExecutionRecordSchema = AllmaStepExecutionRecordSchema.omit({
    eventTimestamp_stepInstanceId_attempt: true,
    itemType: true,
    ttl: true,
});
export type MinimalLogStepExecutionRecord = z.infer<typeof MinimalLogStepExecutionRecordSchema>;