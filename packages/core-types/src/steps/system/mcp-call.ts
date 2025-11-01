import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { StepInputMappingSchema } from '../common.js';

export const McpCallStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.MCP_CALL),
  mcpConnectionId: z.string(),
  toolName: z.string(),
  inputMappings: StepInputMappingSchema.optional(),
  literals: z.record(z.any()).optional(),
});
export type McpCallStepPayload = z.infer<typeof McpCallStepPayloadSchema>;
