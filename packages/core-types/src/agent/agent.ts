import { z } from 'zod';

/**
 * Defines the core data structure for an Agent.
 */
export const AgentSchema = z.object({
  id: z.string().min(1, 'Agent ID is required.'),
  name: z.string().min(1, 'Agent name is required.'),
  description: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  flowIds: z.array(z.string()).default([]),
  flowVariables: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Agent = z.infer<typeof AgentSchema>;

/**
 * Schema for creating a new Agent via the API.
 */
export const CreateAgentInputSchema = AgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

/**
 * Schema for updating an existing Agent via the API.
 * All fields are optional.
 */
export const UpdateAgentInputSchema = CreateAgentInputSchema.partial();
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;
