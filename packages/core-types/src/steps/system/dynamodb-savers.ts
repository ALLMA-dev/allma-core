import { z } from 'zod';

/**
 * Configuration for the `system/dynamodb-query-and-update` data-saver module,
 * which atomically queries for candidate items and applies an update to each —
 * the canonical work-queue "claim a job" pattern. Centralized from the runtime
 * handler so every authoring surface validates it from one schema.
 */
export const DynamoDBQueryAndUpdateCustomConfigSchema = z.object({
  query: z.object({
    tableName: z.string().min(1),
    /** Optional primary-key attribute names, supplied for query performance. */
    keyAttributes: z.array(z.string()).min(1).optional(),
    indexName: z.string().min(1).optional(),
    keyConditionExpression: z.string().min(1),
    expressionAttributeValues: z.record(z.any()),
    expressionAttributeNames: z.record(z.string()).optional(),
    filterExpression: z.string().min(1).optional(),
    /** Caps the number of items queried (and thus updated) per execution. */
    limit: z.number().int().min(1).max(1000000).default(100),
  }),
  update: z.object({
    updateExpression: z.string().min(1),
    expressionAttributeNames: z.record(z.string()).optional(),
    expressionAttributeValues: z.record(z.any()).optional(),
    conditionExpression: z.string().optional(),
  }),
});
export type DynamoDBQueryAndUpdateCustomConfig = z.infer<typeof DynamoDBQueryAndUpdateCustomConfigSchema>;

/**
 * Configuration for the `system/dynamodb-update-item` data-saver module, which
 * performs a single DynamoDB `UpdateItem`.
 */
export const DynamoDBUpdateItemCustomConfigSchema = z.object({
  tableName: z.string().min(1),
  key: z.record(z.union([z.string(), z.number(), z.boolean()])),
  updateExpression: z.string().min(1),
  expressionAttributeNames: z.record(z.string()).optional(),
  expressionAttributeValues: z.record(z.any()).optional(),
  conditionExpression: z.string().optional(),
});
export type DynamoDBUpdateItemCustomConfig = z.infer<typeof DynamoDBUpdateItemCustomConfigSchema>;
