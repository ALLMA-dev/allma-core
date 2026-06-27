import { z } from 'zod';
import { AllmaErrorSchema, S3PointerSchema } from '../common/core.js';
import { ExecutionKindSchema } from '../common/enums.js';
import { NotificationConfigSchema } from '../notifications/execution-events.js';
import { StartFlowExecutionInputSchema } from '../runtime/core.js';
import { StepInstanceSchema } from '../steps/definitions.js';
import { MappingEventSchema, TransitionEvaluationEventSchema } from './events.js';

export const ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD = 'ALLMA_FLOW_EXECUTION_RECORD' as const;
export const ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD = 'ALLMA_STEP_EXECUTION_RECORD' as const;
export const METADATA_SK_VALUE = 'METADATA';

/**
 * The most advanced checkpoint a flow execution has reached, as stamped onto its metadata record.
 * Mirrors `StepInstance.checkpoint` so a single GET of the metadata item carries the milestone.
 */
export const StampedCheckpointSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int().optional(),
  /** 1-based position among all declared checkpoints, for a "stage N of M" label. */
  ordinal: z.number().int().optional(),
});
export type StampedCheckpoint = z.infer<typeof StampedCheckpointSchema>;

/**
 * A compact, one-line roll-up of the deepest active work in an execution tree, written onto the
 * ROOT execution's metadata record so a single GET of the root reflects "what's happening now"
 * even while the parent is suspended by a synchronous sub-flow (Pillar B, §6.4). Guarded by
 * `updatedAt` so the most recent writer wins (e.g. a parent overwrites a finished child's roll-up).
 */
export const ExecutionLiveStatusSchema = z.object({
  activeExecutionId: z.string().uuid(),
  depth: z.number().int(),
  stepDisplayName: z.string().optional(),
  checkpointId: z.string().optional(),
  checkpointLabel: z.string().optional(),
  percent: z.number().int().min(0).max(100).optional(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ExecutionLiveStatus = z.infer<typeof ExecutionLiveStatusSchema>;

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

  // --- Progress (Pillar A, §5.3) — stamped by the orchestrator at each step boundary so the
  // metadata item is a single, lag-free thing to GET/poll. All optional for backward compat
  // (pre-existing executions omit them; the read API falls back to deriving from step records).
  currentStepInstanceId: z.string().optional(),
  currentStepDisplayName: z.string().optional(),
  currentStepType: z.string().optional(),
  completedStepCount: z.number().int().optional(),
  totalStepCount: z.number().int().optional(),
  currentCheckpoint: StampedCheckpointSchema.optional(),
  totalCheckpoints: z.number().int().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  progressUpdatedAt: z.string().datetime({ offset: true }).optional(),

  // --- Execution-tree linkage (Pillar B, §6.1) — present on every execution created after this
  // change. For a top-level execution: rootFlowExecutionId === flowExecutionId, depth === 0,
  // executionKind === 'ROOT'. `triggerSource` is retained for display but is no longer the link.
  parentFlowExecutionId: z.string().uuid().optional(),
  parentStepInstanceId: z.string().optional(),
  rootFlowExecutionId: z.string().uuid().optional(),
  depth: z.number().int().min(0).optional(),
  executionKind: ExecutionKindSchema.optional(),
  /** GSI_ByRoot sort key: `<zero-padded depth>#<parentStepInstanceId>#<flowExecutionId>`. */
  tree_sort_key: z.string().optional(),

  // --- Bubble-up roll-up (Pillar B, §6.4) — written onto the ROOT record only.
  liveStatus: ExecutionLiveStatusSchema.optional(),

  // --- Per-trigger notification config (Pillar C, §7.2a) — persisted on the ROOT record so the
  // crash-safe dispatcher can deliver a TERMINAL event to the caller without Admin credentials.
  notificationConfig: NotificationConfigSchema.optional(),
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
  stepDefinitionId: z.string().optional(),
  stepDefinitionVersion: z.number().int().positive().optional(),
  stepType: z.string(),
  // Denormalized from the flow execution metadata so per-flow step statistics can be
  // computed directly from the step item without an extra lookup. Optional for backward
  // compatibility: step records written before this field existed simply omit it.
  flowDefinitionId: z.string().optional(),
  flowDefinitionVersion: z.number().int().positive().optional(),
  branchId: z.string().optional(),
  branchExecutionId: z.string().optional(),
  status: z.enum(['STARTED', 'COMPLETED', 'FAILED', 'RETRYING_SFN', 'RETRYING_CONTENT', 'SKIPPED']),
  startTime: z.string().datetime({ precision: 3, offset: true }),
  endTime: z.string().datetime({ precision: 3, offset: true }).optional(),
  durationMs: z.number().int().optional(),
  // Promoted to the queryable minimal record (from logDetails.tokenUsage in S3) so token
  // usage can be aggregated for statistics without fetching the full record from S3.
  // Populated for LLM_INVOCATION COMPLETED events; omitted otherwise.
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
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
    stepDefinitionId: z.string().optional(),
    stepDefinitionVersion: z.number().int().positive().optional(),
    stepType: z.string(),
    flowDefinitionId: z.string().optional(),
    flowDefinitionVersion: z.number().int().positive().optional(),
    status: z.enum(['STARTED', 'COMPLETED', 'FAILED', 'RETRYING_SFN', 'RETRYING_CONTENT', 'SKIPPED']),
    startTime: z.string().datetime({ precision: 3, offset: true }),
    endTime: z.string().datetime({ precision: 3, offset: true }).optional(),
    durationMs: z.number().int().optional(),
    inputTokens: z.number().int().optional(),
    outputTokens: z.number().int().optional(),
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