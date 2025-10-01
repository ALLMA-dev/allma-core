import { z } from 'zod';
import { AllmaErrorSchema, S3PointerSchema } from '../index.js';
import { AllmaFlowExecutionRecordSchema, MinimalLogStepExecutionRecordSchema } from './records.js';

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
 * A discriminated union schema for all possible payloads sent to the ExecutionLogger Lambda.
 */
export const ExecutionLoggerPayloadSchema = z.discriminatedUnion('action', [
  CreateMetadataPayloadSchema,
  UpdateFinalStatusPayloadSchema,
  LogStepExecutionPayloadSchema,
]);
export type ExecutionLoggerPayload = z.infer<typeof ExecutionLoggerPayloadSchema>;