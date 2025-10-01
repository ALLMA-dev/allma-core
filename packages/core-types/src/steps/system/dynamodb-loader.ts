import { z } from 'zod';

const DynamoDBTemplateableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const DynamoDBGetOperationSchema = z.object({
  operation: z.literal('GET'),
  tableName: z.string().min(1),
  key: z.record(DynamoDBTemplateableValueSchema),
});

const DynamoDBQueryOperationSchema = z.object({
  operation: z.literal('QUERY'),
  tableName: z.string().min(1),
  indexName: z.string().min(1).optional(),
  select: z.enum(['ALL_ATTRIBUTES', 'ALL_PROJECTED_ATTRIBUTES', 'SPECIFIC_ATTRIBUTES', 'COUNT']).optional(),
  keyConditionExpression: z.string().min(1),
  expressionAttributeValues: z.record(DynamoDBTemplateableValueSchema).optional(),
  filterExpression: z.string().min(1).optional(),
  projectionExpression: z.string().min(1).optional(),
  limit: z.number().int().positive().optional(),
  scanIndexForward: z.boolean().optional().default(true),
});

const DynamoDBScanOperationSchema = z.object({
  operation: z.literal('SCAN'),
  tableName: z.string().min(1),
  indexName: z.string().min(1).optional(),
  select: z.enum(['ALL_ATTRIBUTES', 'ALL_PROJECTED_ATTRIBUTES', 'SPECIFIC_ATTRIBUTES', 'COUNT']).optional(),
  expressionAttributeValues: z.record(DynamoDBTemplateableValueSchema).optional(),
  filterExpression: z.string().min(1).optional(),
  projectionExpression: z.string().min(1).optional(),
  limit: z.number().int().positive().optional(),
});

/**
 * Defines the configuration for the DynamoDB data loader module.
 */
export const DynamoDBLoaderCustomConfigSchema = z.discriminatedUnion("operation", [
  DynamoDBGetOperationSchema,
  DynamoDBQueryOperationSchema,
  DynamoDBScanOperationSchema,
]);
export type DynamoDBLoaderCustomConfig = z.infer<typeof DynamoDBLoaderCustomConfigSchema>;