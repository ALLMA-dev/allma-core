import { z } from 'zod';
import { PromptTemplateSchema } from '../prompt/index.js';
import { ITEM_TYPE_ALLMA_PROMPT_TEMPLATE, ITEM_TYPE_ALLMA_FLOW_DEFINITION, ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY } from '../common/core.js';
import { StepTypeSchema } from '../steps/index.js';

// --- Prompt Template Storage Items (Versioned Model) ---

export const PromptTemplateMetadataStorageItemSchema = z.object({
  PK: z.string().startsWith('PROMPT_TEMPLATE#'),
  SK: z.literal('METADATA'),
  itemType: z.literal(ITEM_TYPE_ALLMA_PROMPT_TEMPLATE),
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  latestVersion: z.number().int().positive(),
  publishedVersion: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PromptTemplateMetadataStorageItem = z.infer<typeof PromptTemplateMetadataStorageItemSchema>;

export const PromptTemplateVersionStorageItemSchema = PromptTemplateSchema.extend({
  PK: z.string().startsWith('PROMPT_TEMPLATE#'),
  SK: z.string().startsWith('VERSION#'),
  itemType: z.literal(ITEM_TYPE_ALLMA_PROMPT_TEMPLATE),
});
export type PromptTemplateVersionStorageItem = z.infer<typeof PromptTemplateVersionStorageItemSchema>;

// --- Flow Definition Storage Items (Versioned Model) ---

export const FlowMetadataStorageItemSchema = z.object({
  PK: z.string().startsWith('FLOW_DEF#'),
  SK: z.literal('METADATA'),
  itemType: z.literal(ITEM_TYPE_ALLMA_FLOW_DEFINITION),
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  emailTriggerAddress: z.string().email().optional().nullable(),
  latestVersion: z.number().int().positive(),
  publishedVersion: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FlowMetadataStorageItem = z.infer<typeof FlowMetadataStorageItemSchema>;

// --- External Step Registry Item ---

export const ExternalStepRegistryItemSchema = z.object({
  PK: z.string(), // e.g., EXTERNAL_STEP#allma-data-ingestion/crawler
  SK: z.literal('METADATA'),
  itemType: z.literal(ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY),
  moduleIdentifier: z.string(), // e.g., allma-data-ingestion/crawler
  lambdaArn: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  stepType: StepTypeSchema, // e.g., DATA_LOAD
  defaultConfig: z.record(z.any()), // Default configuration for the step
});
export type ExternalStepRegistryItem = z.infer<typeof ExternalStepRegistryItemSchema>;