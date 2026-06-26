import { z } from 'zod';
import { AllmaErrorSchema, S3PointerSchema } from '../index.js';
import {
  AllmaFlowExecutionRecordSchema,
  MinimalLogStepExecutionRecordSchema,
  StampedCheckpointSchema,
  ExecutionLiveStatusSchema,
} from './records.js';

// --- Payload Schemas for the asynchronous Logger Lambda ---

const CreateMetadataPayloadSchema = z.object({
  action: z.literal('CREATE_METADATA'),
  record: AllmaFlowExecutionRecordSchema.pick({
      flowExecutionId: true,
      flowDefinitionId: true,
      flowDefinitionVersion: true,
      startTime: true,
      initialInputPayload: true,
      triggerSource: true,
      enableExecutionLogs: true,
      // Execution-tree linkage (Pillar B) — persisted at creation so a single GSI query can
      // reconstruct the whole tree. Defaulted to a ROOT node by the logger when absent.
      parentFlowExecutionId: true,
      parentStepInstanceId: true,
      rootFlowExecutionId: true,
      depth: true,
      executionKind: true,
      // Per-trigger notification callback (Pillar C) — persisted on the root for the dispatcher.
      notificationConfig: true,
  })
});

const UpdateFinalStatusPayloadSchema = z.object({
  action: z.literal('UPDATE_FINAL_STATUS'),
  flowExecutionId: z.string().uuid(),
  status: z.enum(['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  endTime: z.string().datetime({ precision: 3, offset: true }),
  finalContextDataS3Pointer: S3PointerSchema.optional(),
  errorInfo: AllmaErrorSchema.optional(),
});

const LogStepExecutionPayloadSchema = z.object({
  action: z.literal('LOG_STEP_EXECUTION'),
  record: MinimalLogStepExecutionRecordSchema,
});

/**
 * Stamps live progress (Pillar A) onto a flow execution's metadata record, and optionally bubbles
 * a one-line roll-up up to the ROOT record (Pillar B, §6.4). Both writes are guarded so they only
 * touch an existing metadata item and never move progress backward (monotonic on `progressUpdatedAt`
 * / `liveStatus.updatedAt`). Fire-and-forget like the other logger actions.
 */
const UpdateProgressPayloadSchema = z.object({
  action: z.literal('UPDATE_PROGRESS'),
  flowExecutionId: z.string().uuid(),
  progress: z.object({
    currentStepInstanceId: z.string().optional(),
    currentStepDisplayName: z.string().optional(),
    currentStepType: z.string().optional(),
    completedStepCount: z.number().int().optional(),
    totalStepCount: z.number().int().optional(),
    currentCheckpoint: StampedCheckpointSchema.optional(),
    totalCheckpoints: z.number().int().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    progressUpdatedAt: z.string().datetime({ offset: true }),
  }),
  rootBubbleUp: z
    .object({
      rootFlowExecutionId: z.string().uuid(),
      liveStatus: ExecutionLiveStatusSchema,
    })
    .optional(),
});

/**
 * A discriminated union schema for all possible payloads sent to the ExecutionLogger Lambda.
 */
export const ExecutionLoggerPayloadSchema = z.discriminatedUnion('action', [
  CreateMetadataPayloadSchema,
  UpdateFinalStatusPayloadSchema,
  LogStepExecutionPayloadSchema,
  UpdateProgressPayloadSchema,
]);
export type ExecutionLoggerPayload = z.infer<typeof ExecutionLoggerPayloadSchema>;