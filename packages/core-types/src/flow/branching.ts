import { z } from 'zod';
import { AllmaErrorSchema, JsonPathStringSchema } from '../common/core.js';
import { AggregationStrategySchema, StepTypeSchema } from '../common/enums.js';
import { StepInputMappingSchema } from '../steps/common.js';

const StepInstanceRefBranchSchema = z.object({
    stepInstanceId: z.string().min(1)
      .describe("Reference to a step instance defined in the parent flow's 'steps' map."),
    inputMappings: StepInputMappingSchema.optional(),
    literals: z.record(z.any()).optional(),
});
  
const InlineSubFlowBranchSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.START_SUB_FLOW),
    subFlowDefinitionId: z.string().min(1),
    inputMappings: StepInputMappingSchema.optional(),
    literals: z.record(z.any()).optional(),
});

/**
 * Defines a single branch of execution within a parallel step.
 */
export const BranchDefinitionSchema = z.object({
    branchId: z.string().min(1, "Branch ID is required."),
    condition: JsonPathStringSchema.optional(),
    icon: z.string().optional(),
}).and(z.union([
    StepInstanceRefBranchSchema,
    InlineSubFlowBranchSchema,
]));
export type BranchDefinition = z.infer<typeof BranchDefinitionSchema>;

/**
 * Defines the configuration for aggregating results from parallel branches.
 */
export const AggregationConfigSchema = z.object({
  strategy: AggregationStrategySchema.default(AggregationStrategySchema.enum.COLLECT_ARRAY),
  dataPath: JsonPathStringSchema.optional(),
  customModuleIdentifier: z.string().min(1).optional(),
  failOnBranchError: z.boolean().optional().default(true),
  maxConcurrency: z.number().int().min(0).optional(),
  toleratedFailurePercentage: z.number().min(0).max(100).optional(),
}).refine(data => !(data.strategy === AggregationStrategySchema.enum.CUSTOM_MODULE && !data.customModuleIdentifier), {
  message: "customModuleIdentifier is required when aggregation strategy is CUSTOM_MODULE.",
  path: ["customModuleIdentifier"],
});
export type AggregationConfig = z.infer<typeof AggregationConfigSchema>;

/**
 * The payload sent to a branch executor.
 */
export const BranchExecutionPayloadSchema = z.object({
  branchId: z.string(),
  branchDefinition: BranchDefinitionSchema,
  branchInput: z.record(z.any()),
  parentFlowExecutionId: z.string().uuid(),
  parentFlowDefinitionId: z.string(),
  parentFlowDefinitionVersion: z.number().int().positive(),
  enableExecutionLogs: z.boolean(),
});
export type BranchExecutionPayload = z.infer<typeof BranchExecutionPayloadSchema>;

/**
 * The result returned from a branch executor, collected by the SFN Map state.
 */
export const BranchResultSchema = z.object({
  branchId: z.string(),
  output: z.any().optional(),
  error: AllmaErrorSchema.optional(),
});
export type BranchResult = z.infer<typeof BranchResultSchema>;