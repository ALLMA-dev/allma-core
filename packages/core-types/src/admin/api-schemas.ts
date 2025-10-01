import { z } from 'zod';
import { PromptTemplateSchema } from '../prompt/index.js';
import { BaseStepDefinitionSchema } from '../steps/definitions.js';

// Schemas for API bodies and responses, organized by domain.

// --- General ---
export interface PaginatedResponse<T> {
    items: T[];
    nextToken?: string;
    totalCount?: number;
}

// --- Flow Execution & Control ---

export const RedriveFlowApiInputSchema = z.object({
  // No body needed, flowExecutionId is from path parameter
});
export type RedriveFlowApiInput = z.infer<typeof RedriveFlowApiInputSchema>;

export const RedriveFlowApiOutputSchema = z.object({
  message: z.string(),
  originalFlowExecutionId: z.string().uuid(),
  newFlowExecutionId: z.string().uuid(),
});
export type RedriveFlowApiOutput = z.infer<typeof RedriveFlowApiOutputSchema>;

export const StatefulRedriveInputSchema = z.object({
  startFromStepInstanceId: z.string().min(1, "startFromStepInstanceId is required."),
  modifiedContextData: z.record(z.any()).optional(),
});
export type StatefulRedriveInput = z.infer<typeof StatefulRedriveInputSchema>;

export const SandboxStepInputSchema = z.object({
  flowDefinitionId: z.string().min(1),
  flowDefinitionVersion: z.number().int().positive(),
  stepInstanceId: z.string().min(1),
  contextData: z.record(z.any()),
});
export type SandboxStepInput = z.infer<typeof SandboxStepInputSchema>;

export const TriggerFlowApiInputSchema = z.record(z.any());
export type TriggerFlowApiInput = z.infer<typeof TriggerFlowApiInputSchema>;

export const TriggerFlowApiOutputSchema = z.object({
  message: z.string(),
  flowExecutionId: z.string().uuid(),
});
export type TriggerFlowApiOutput = z.infer<typeof TriggerFlowApiOutputSchema>;


// --- Flow Definition Management ---

export const CreateFlowInputSchema = z.object({
  name: z.string().min(1, "Flow name is required."),
  description: z.string().optional().nullable(),
});
export type CreateFlowInput = z.infer<typeof CreateFlowInputSchema>;

export const UpdateFlowConfigInputSchema = z.object({
    name: z.string().min(1, "Flow name is required."),
    description: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
});
export type UpdateFlowConfigInput = z.infer<typeof UpdateFlowConfigInputSchema>;

export const CloneFlowInputSchema = z.object({
  name: z.string().min(1, "New flow name is required."),
});
export type CloneFlowInput = z.infer<typeof CloneFlowInputSchema>;

export const CreateFlowVersionInputSchema = z.object({
  sourceVersion: z.union([z.number().int().positive(), z.literal('latest')]),
});
export type CreateFlowVersionInput = z.infer<typeof CreateFlowVersionInputSchema>;


// --- Prompt Template Management ---

export const CreatePromptTemplateInputSchema = z.object({
  name: z.string().min(1, "Prompt name is required."),
  description: z.string().optional().nullable(),
});
export type CreatePromptTemplateInput = z.infer<typeof CreatePromptTemplateInputSchema>;

export const UpdatePromptTemplateInputSchema = PromptTemplateSchema.omit({
  createdAt: true, 
  updatedAt: true, 
  isPublished: true, 
  publishedAt: true,
  id: true,
  version: true,
});
export type UpdatePromptTemplateInput = z.infer<typeof UpdatePromptTemplateInputSchema>;

export const ClonePromptInputSchema = z.object({
  name: z.string().min(1, "New prompt name is required."),
});
export type ClonePromptInput = z.infer<typeof ClonePromptInputSchema>;

export const CreatePromptVersionInputSchema = z.object({
  sourceVersion: z.union([z.number().int().positive(), z.literal('latest')]),
});
export type CreatePromptVersionInput = z.infer<typeof CreatePromptVersionInputSchema>;

// --- Step Definition Management ---

/**
 * Schema for creating a new Step Definition. This is based on the core step logic
 * plus user-provided metadata.
 */
export const CreateStepDefinitionInputSchema = BaseStepDefinitionSchema.and(z.object({
    name: z.string().min(1, "Step definition name is required."),
    description: z.string().optional().nullable(),
}));
export type CreateStepDefinitionInput = z.infer<typeof CreateStepDefinitionInputSchema>;

/**
 * Schema for updating an existing Step Definition. For PUT, this is the same as create.
 */
export const UpdateStepDefinitionInputSchema = CreateStepDefinitionInputSchema;
export type UpdateStepDefinitionInput = z.infer<typeof UpdateStepDefinitionInputSchema>;
