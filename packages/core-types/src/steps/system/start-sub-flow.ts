import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { StepInputMappingSchema } from '../common.js';

/**
 * Defines the configuration for a step that starts another flow as a sub-flow.
 */
export const StartSubFlowStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.START_SUB_FLOW),
  moduleIdentifier: z.undefined().optional(),
  subFlowDefinitionId: z.string().min(1).describe("Sub-Flow ID|text|The ID of the flow definition to start."),
  subFlowVersion: z.union([z.string(), z.literal('LATEST_PUBLISHED')]).optional().default('LATEST_PUBLISHED').describe("Sub-Flow Version|text|e.g., 1 or LATEST_PUBLISHED"),
  subFlowExecutionMode: z.enum(['SYNC', 'ASYNC']).optional().default('SYNC').describe("Execution Mode|select|SYNC: wait for result. ASYNC: trigger and continue."),
  inputMappingsToSubFlow: StepInputMappingSchema.optional().describe("Input Mappings|json|Map current flow context to the sub-flow's initial context."),
}).passthrough();