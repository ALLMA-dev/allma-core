import { z } from 'zod';
import { JsonPathStringSchema } from '../common/core.js';

/**
 * Defines a declarative mapping from the flow context to a variable in a prompt template.
 */
export const TemplateContextMappingItemSchema = z.object({
  sourceJsonPath: JsonPathStringSchema,
  formatAs: z.enum(['RAW', 'JSON', 'CUSTOM_STRING']).optional().default('RAW'),
  selectFields: z.array(z.string()).optional(),
  itemTemplate: z.string().optional(),
  joinSeparator: z.string().optional().default('\n'),
}).refine(data => !(data.formatAs === 'CUSTOM_STRING' && !data.itemTemplate), {
  message: "itemTemplate is required when formatAs is 'CUSTOM_STRING'.",
  path: ['itemTemplate'],
});
export type TemplateContextMappingItem = z.infer<typeof TemplateContextMappingItemSchema>;