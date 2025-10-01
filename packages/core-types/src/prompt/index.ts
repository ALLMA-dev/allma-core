import { z } from 'zod';

/**
 * Defines an immutable version of a prompt template.
 */
export const PromptTemplateSchema = z.object({
  id: z.string().min(1, "Prompt Template ID is required"),
  name: z.string().min(1, "Display name is required"),
  description: z.string().optional().nullable(),
  content: z.string().min(1, "Prompt content cannot be empty"),
  version: z.number().int().positive().optional().default(1),
  isPublished: z.boolean().default(false),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable().optional(),
}).passthrough();
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;