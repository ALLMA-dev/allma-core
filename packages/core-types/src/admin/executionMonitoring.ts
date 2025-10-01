import { z } from 'zod';
import { AllmaFlowExecutionRecordSchema, AllmaStepExecutionRecordSchema } from '../logging/records.js';

/**
 * A summary of a flow execution for display in a list view.
 */
export const FlowExecutionSummarySchema = z.object({
  flowExecutionId: z.string().uuid(),
  flowDefinitionVersion: z.number().int().optional(),
  status: z.enum(['INITIALIZING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  durationMs: z.number().int().optional(),
  triggerSource: z.string().optional(),
  enableExecutionLogs: z.boolean(),
});
export type FlowExecutionSummary = z.infer<typeof FlowExecutionSummarySchema>;

/**
 * A detailed view of a flow execution, including its metadata and all step records.
 */
export const FlowExecutionDetailsSchema = z.object({
  metadata: AllmaFlowExecutionRecordSchema,
  steps: z.array(AllmaStepExecutionRecordSchema),
  resolvedFinalContextData: z.record(z.any()).optional(),
});
export type FlowExecutionDetails = z.infer<typeof FlowExecutionDetailsSchema>;

/**
 * API response for listing executions.
 */
export const ListFlowExecutionsResponseSchema = z.object({
    items: z.array(FlowExecutionSummarySchema),
    nextToken: z.string().optional(),
    totalCount: z.number().optional(),
});
export type ListFlowExecutionsResponse = z.infer<typeof ListFlowExecutionsResponseSchema>;

/**
 * A group of steps belonging to a single parallel branch execution.
 */
export const BranchExecutionGroupSchema = z.object({
    branchId: z.string(),
    steps: z.array(AllmaStepExecutionRecordSchema),
});
export type BranchExecutionGroup = z.infer<typeof BranchExecutionGroupSchema>;

/**
 * API response for fetching branch steps, keyed by the unique branchExecutionId.
 */
export const BranchStepsResponseSchema = z.record(
    z.string(),
    BranchExecutionGroupSchema
);
export type BranchStepsResponse = z.infer<typeof BranchStepsResponseSchema>;