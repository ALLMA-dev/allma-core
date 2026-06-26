import { z } from 'zod';
import { AllmaFlowExecutionRecordSchema, AllmaStepExecutionRecordSchema } from '../logging/records.js';
import { ExecutionKindSchema } from '../common/enums.js';

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
 * Live progress of a single flow execution, computed for the Admin UI and consumer status views.
 *
 * Progress uses two layers:
 *  - L2 (checkpoints): if the flow tags any step with a `checkpoint`, progress is measured against
 *    those milestones — `progressPercent` and `currentCheckpoint` reflect the milestone reached.
 *  - L1 (step count): otherwise, progress is `completedStepCount / totalStepCount`.
 *
 * `children` holds nested sub-flow / branch execution nodes (Pillar B); it is empty in the
 * single-execution view and populated in `mode=tree`.
 */
export interface ExecutionProgressNode {
  flowExecutionId: string;
  flowDefinitionId: string;
  flowDefinitionVersion?: number;
  /** Position of this node in the execution tree. Defaults to a ROOT node for old executions. */
  executionKind?: z.infer<typeof ExecutionKindSchema>;
  /** The step in the PARENT flow that launched this node (sub-flows / branches only). */
  parentStepInstanceId?: string;
  /** 0 = root. */
  depth?: number;
  status: 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';
  /** True when the current step can pause for a long time (WAIT_FOR_EXTERNAL_EVENT / POLL_EXTERNAL_API). */
  isWaiting: boolean;
  /** The step currently executing (omitted once the execution reaches a terminal status). */
  currentStep?: {
    stepInstanceId: string;
    displayName?: string;
    stepType?: string;
  };
  /** The most advanced checkpoint reached so far (only when the flow declares checkpoints). */
  currentCheckpoint?: {
    id: string;
    label: string;
    order?: number;
    /** 1-based position of this checkpoint among all declared checkpoints. */
    ordinal?: number;
  };
  completedStepCount: number;
  totalStepCount?: number;
  totalCheckpoints?: number;
  progressPercent: number;
  startTime: string;
  endTime?: string;
  /** Nested sub-flow / parallel-branch nodes. Empty in single mode. */
  children: ExecutionProgressNode[];
}

export const ExecutionProgressNodeSchema: z.ZodType<ExecutionProgressNode> = z.lazy(() =>
  z.object({
    flowExecutionId: z.string().uuid(),
    flowDefinitionId: z.string(),
    flowDefinitionVersion: z.number().int().optional(),
    executionKind: ExecutionKindSchema.optional(),
    parentStepInstanceId: z.string().optional(),
    depth: z.number().int().optional(),
    status: z.enum(['INITIALIZING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
    isWaiting: z.boolean(),
    currentStep: z
      .object({
        stepInstanceId: z.string(),
        displayName: z.string().optional(),
        stepType: z.string().optional(),
      })
      .optional(),
    currentCheckpoint: z
      .object({
        id: z.string(),
        label: z.string(),
        order: z.number().int().optional(),
        ordinal: z.number().int().optional(),
      })
      .optional(),
    completedStepCount: z.number().int(),
    totalStepCount: z.number().int().optional(),
    totalCheckpoints: z.number().int().optional(),
    progressPercent: z.number().int().min(0).max(100),
    startTime: z.string(),
    endTime: z.string().optional(),
    children: z.array(ExecutionProgressNodeSchema),
  }),
);

/**
 * API response for the execution-progress endpoint. `headline` is a one-line summary of the
 * deepest active work, suitable for compact status widgets.
 */
export const ExecutionProgressResponseSchema = z.object({
  root: ExecutionProgressNodeSchema,
  headline: z.object({
    executionId: z.string().uuid(),
    label: z.string(),
    percent: z.number().int().min(0).max(100),
    status: z.string(),
    isWaiting: z.boolean(),
  }),
});
export type ExecutionProgressResponse = z.infer<typeof ExecutionProgressResponseSchema>;

/**
 * A group of steps belonging to a single parallel branch execution.
 */
export const BranchExecutionGroupSchema = z.object({
    executionKey: z.string(), // Unique identifier for the branch instance
    branchId: z.string(),     // Logical branch ID from definition
    steps: z.array(AllmaStepExecutionRecordSchema),
});
export type BranchExecutionGroup = z.infer<typeof BranchExecutionGroupSchema>;

/**
 * Paginated API response for fetching branch steps.
 */
export const BranchStepsResponseSchema = z.object({
    groups: z.array(BranchExecutionGroupSchema),
    totalBranches: z.number(),
    hasMore: z.boolean(),
});
export type BranchStepsResponse = z.infer<typeof BranchStepsResponseSchema>;