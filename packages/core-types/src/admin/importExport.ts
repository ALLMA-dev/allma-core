import { z } from 'zod';
// Import schemas for Zod definitions
import { StepDefinitionSchema } from '../steps/definitions.js';
import { FlowDefinitionSchema } from '../flow/core.js';
import { PromptTemplateSchema } from '../prompt/index.js';
import { McpConnectionSchema } from '../mcp/connections.js';
import { AgentSchema } from '../agent/agent.js';
// Import types for explicit type annotations
import type { StepDefinition } from '../steps/definitions.js';
import type { FlowDefinition } from '../flow/core.js';
import type { PromptTemplate } from '../prompt/index.js';
import type { McpConnection } from '../mcp/connections.js';
import type { Agent } from '../agent/agent.js';

/**
 * Explicit type for the Allma export format. This prevents TypeScript from hitting
 * serialization limits when inferring the type from the complex Zod schema.
 */
export type AllmaExportFormat = {
  formatVersion: '1.0';
  exportedAt: string;
  stepDefinitions?: StepDefinition[];
  flows?: FlowDefinition[];
  promptTemplates?: PromptTemplate[];
  mcpConnections?: McpConnection[];
  agents?: Agent[];
};

/**
 * Defines the structure of the JSON file used for import/export.
 * It is cast to `z.ZodType<AllmaExportFormat>` to break the type inference chain
 * and prevent the TypeScript error "TS7056: The inferred type of this node exceeds
 * the maximum length the compiler will serialize."
 */
export const AllmaExportFormatSchema = z.object({
  formatVersion: z.literal('1.0'),
  exportedAt: z.string().datetime(),
  stepDefinitions: z.array(StepDefinitionSchema).optional(),
  flows: z.array(FlowDefinitionSchema).optional(),
  promptTemplates: z.array(PromptTemplateSchema).optional(),
  mcpConnections: z.array(McpConnectionSchema).optional(),
  agents: z.array(AgentSchema).optional(),
}) as z.ZodType<AllmaExportFormat>;


/**
 * Defines the payload for the /export API endpoint.
 * If no IDs are provided, all items of that type will be exported.
 */
export const ExportApiInputSchema = z.object({
  flowIds: z.array(z.string()).optional(),
  stepDefinitionIds: z.array(z.string()).optional(),
  promptTemplateIds: z.array(z.string()).optional(),
  mcpConnectionIds: z.array(z.string()).optional(),
  agentIds: z.array(z.string()).optional(),
});

/**
 * Explicit type for the import API payload.
 */
export type ImportApiInput = AllmaExportFormat & {
  options: {
    overwrite: boolean;
  };
};

/**
 * Defines the payload for the /import API endpoint.
 * We redefine the object and add the 'options' field, then apply the same
 * type assertion pattern as `AllmaExportFormatSchema` to avoid TS7056.
 * Using `.extend()` here is problematic due to the type assertion on the base schema.
 */
export const ImportApiInputSchema = z.object({
    formatVersion: z.literal('1.0'),
    exportedAt: z.string().datetime(),
    stepDefinitions: z.array(StepDefinitionSchema).optional(),
    flows: z.array(FlowDefinitionSchema).optional(),
    promptTemplates: z.array(PromptTemplateSchema).optional(),
    mcpConnections: z.array(McpConnectionSchema).optional(),
    agents: z.array(AgentSchema).optional(),
    options: z.object({
        overwrite: z.boolean(),
    }),
}) as z.ZodType<ImportApiInput>;

/**
 * Defines the structure of the summary returned after an import operation.
 */
export const ImportApiResponseSchema = z.object({
  created: z.object({
    flows: z.number(),
    steps: z.number(),
    prompts: z.number(),
    mcpConnections: z.number(),
    agents: z.number(), 
  }),
  updated: z.object({
    flows: z.number(),
    steps: z.number(),
    prompts: z.number(),
    mcpConnections: z.number(),
    agents: z.number(), 
  }),
  skipped: z.object({
    flows: z.number(),
    steps: z.number(),
    prompts: z.number(),
    mcpConnections: z.number(),
    agents: z.number(),
  }),
  errors: z.array(z.object({
    id: z.string(),
    type: z.enum(['flow', 'step', 'prompt', 'mcpConnection', 'agent']), 
    message: z.string(),
  })),
});

// Export corresponding TypeScript types (those that don't cause issues can still use z.infer)
export type ExportApiInput = z.infer<typeof ExportApiInputSchema>;
export type ImportApiResponse = z.infer<typeof ImportApiResponseSchema>;