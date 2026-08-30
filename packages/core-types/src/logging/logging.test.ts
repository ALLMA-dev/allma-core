import { describe, it, expect } from 'vitest';
import * as CoreTypes from '../index.js';
import * as LoggingTypes from './index.js';
import {
  AllmaFlowExecutionRecordSchema,
  AllmaStepExecutionRecordSchema,
  ExecutionLoggerPayloadSchema,
  MappingEventType,
  MappingEventTypeSchema,
  MappingEventStatus,
  MappingEventStatusSchema,
  MappingEventSchema,
  TransitionEvaluationEventSchema,
  StampedCheckpointSchema,
  ExecutionLiveStatusSchema,
  FullLogStepExecutionRecordSchema,
  MinimalLogStepExecutionRecordSchema,
  ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
  ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
  METADATA_SK_VALUE,
} from './index.js';

describe('Logging exports & schemas', () => {
  describe('Console logger exclusion', () => {
    it('does not export log_info, log_warn, log_error, or log_debug from logging sub-barrel', () => {
      const exports = LoggingTypes as Record<string, unknown>;
      expect(exports.log_info).toBeUndefined();
      expect(exports.log_warn).toBeUndefined();
      expect(exports.log_error).toBeUndefined();
      expect(exports.log_debug).toBeUndefined();
    });

    it('does not export log_info, log_warn, log_error, or log_debug from main core-types barrel', () => {
      const exports = CoreTypes as Record<string, unknown>;
      expect(exports.log_info).toBeUndefined();
      expect(exports.log_warn).toBeUndefined();
      expect(exports.log_error).toBeUndefined();
      expect(exports.log_debug).toBeUndefined();
    });
  });

  describe('Expected logging exports', () => {
    it('exports all logging schemas and constants from logging sub-barrel', () => {
      expect(AllmaFlowExecutionRecordSchema).toBeDefined();
      expect(AllmaStepExecutionRecordSchema).toBeDefined();
      expect(FullLogStepExecutionRecordSchema).toBeDefined();
      expect(MinimalLogStepExecutionRecordSchema).toBeDefined();
      expect(ExecutionLoggerPayloadSchema).toBeDefined();
      expect(MappingEventType).toBeDefined();
      expect(MappingEventTypeSchema).toBeDefined();
      expect(MappingEventStatus).toBeDefined();
      expect(MappingEventStatusSchema).toBeDefined();
      expect(MappingEventSchema).toBeDefined();
      expect(TransitionEvaluationEventSchema).toBeDefined();
      expect(StampedCheckpointSchema).toBeDefined();
      expect(ExecutionLiveStatusSchema).toBeDefined();
      expect(ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD).toBe('ALLMA_FLOW_EXECUTION_RECORD');
      expect(ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD).toBe('ALLMA_STEP_EXECUTION_RECORD');
      expect(METADATA_SK_VALUE).toBe('METADATA');
    });

    it('exports all logging schemas and constants from root core-types barrel', () => {
      expect(CoreTypes.AllmaFlowExecutionRecordSchema).toBeDefined();
      expect(CoreTypes.AllmaStepExecutionRecordSchema).toBeDefined();
      expect(CoreTypes.ExecutionLoggerPayloadSchema).toBeDefined();
      expect(CoreTypes.MappingEventType).toBeDefined();
      expect(CoreTypes.MappingEventTypeSchema).toBeDefined();
      expect(CoreTypes.MappingEventStatus).toBeDefined();
      expect(CoreTypes.MappingEventStatusSchema).toBeDefined();
      expect(CoreTypes.MappingEventSchema).toBeDefined();
      expect(CoreTypes.TransitionEvaluationEventSchema).toBeDefined();
      expect(CoreTypes.StampedCheckpointSchema).toBeDefined();
      expect(CoreTypes.ExecutionLiveStatusSchema).toBeDefined();
    });
  });

  describe('Logging schema validation', () => {
    it('validates mapping event types and statuses', () => {
      expect(MappingEventTypeSchema.safeParse('INPUT_MAPPING').success).toBe(true);
      expect(MappingEventTypeSchema.safeParse('OUTPUT_MAPPING').success).toBe(true);
      expect(MappingEventTypeSchema.safeParse('INVALID_TYPE').success).toBe(false);

      expect(MappingEventStatusSchema.safeParse('SUCCESS').success).toBe(true);
      expect(MappingEventStatusSchema.safeParse('ERROR').success).toBe(true);
      expect(MappingEventStatusSchema.safeParse('INVALID_STATUS').success).toBe(false);
    });

    it('validates execution logger payload discriminated union', () => {
      const validPayload = {
        action: 'UPDATE_FINAL_STATUS',
        flowExecutionId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'COMPLETED',
        endTime: '2026-08-30T12:00:00.000Z',
      };
      expect(ExecutionLoggerPayloadSchema.safeParse(validPayload).success).toBe(true);

      const invalidPayload = {
        action: 'UPDATE_FINAL_STATUS',
        flowExecutionId: 'not-a-uuid',
        status: 'COMPLETED',
        endTime: '2026-08-30T12:00:00.000Z',
      };
      expect(ExecutionLoggerPayloadSchema.safeParse(invalidPayload).success).toBe(false);
    });
  });
});
