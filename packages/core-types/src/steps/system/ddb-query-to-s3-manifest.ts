import { z } from 'zod';

/**
 * Configuration for the `system/ddb-query-to-s3-manifest` data-loader module,
 * which queries DynamoDB and writes the resulting items (or pointers to them)
 * as a manifest object in S3. Centralized from the runtime handler so the
 * importer, admin save API, Visual Editor, and flow builder validate it from a
 * single source of truth.
 */
export const DdbQueryToS3ManifestCustomConfigSchema = z.object({
  query: z.object({
    tableName: z.string().min(1, 'tableName is required.'),
    indexName: z.string().min(1, 'indexName is required.').optional(),
    keyConditionExpression: z.string().min(1, 'keyConditionExpression is required.'),
    expressionAttributeValues: z.record(z.union([z.string(), z.number(), z.boolean()])),
    expressionAttributeNames: z.record(z.string()).optional(),
    filterExpression: z.string().min(1).optional(),
    projectionExpression: z.string().min(1).optional(),
  }),
  destination: z.object({
    bucketName: z.string().min(1, 'destination bucketName is required.'),
    key: z.string().min(1, 'destination key is required.'),
  }),
  enableItemOffloading: z.boolean().optional().default(false),
});
export type DdbQueryToS3ManifestCustomConfig = z.infer<typeof DdbQueryToS3ManifestCustomConfigSchema>;
