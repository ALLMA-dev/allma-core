import { z } from 'zod';
import { StepDefinitionSchema } from '../steps/definitions.js';
import { FlowDefinitionSchema } from '../flow/core.js';

/**
 * Defines the structure of the JSON file used for import/export.
 */
export const AllmaExportFormatSchema = z.object({
  formatVersion: z.literal('1.0'),
  exportedAt: z.string().datetime(),
  stepDefinitions: z.array(StepDefinitionSchema),
  flows: z.array(FlowDefinitionSchema),
});

/**
 * Defines the payload for the /export API endpoint.
 * If no IDs are provided, all items of that type will be exported.
 */
export const ExportApiInputSchema = z.object({
  flowIds: z.array(z.string()).optional(),
  stepDefinitionIds: z.array(z.string()).optional(),
});

/**
 * Defines the payload for the /import API endpoint.
 */
export const ImportApiInputSchema = AllmaExportFormatSchema.extend({
  options: z.object({
    overwrite: z.boolean(),
  }),
});

/**
 * Defines the structure of the summary returned after an import operation.
 */
export const ImportApiResponseSchema = z.object({
  created: z.object({
    flows: z.number(),
    steps: z.number(),
  }),
  updated: z.object({
    flows: z.number(),
    steps: z.number(),
  }),
  skipped: z.object({
    flows: z.number(),
    steps: z.number(),
  }),
  errors: z.array(z.object({
    id: z.string(),
    type: z.enum(['flow', 'step']),
    message: z.string(),
  })),
});

// Export corresponding TypeScript types
export type AllmaExportFormat = z.infer<typeof AllmaExportFormatSchema>;
export type ExportApiInput = z.infer<typeof ExportApiInputSchema>;
export type ImportApiInput = z.infer<typeof ImportApiInputSchema>;
export type ImportApiResponse = z.infer<typeof ImportApiResponseSchema>;
