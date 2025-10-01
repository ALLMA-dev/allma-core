import { z } from 'zod';

/**
 * Defines the configuration for the S3 data saver module.
 */
export const S3DataSaverCustomConfigSchema = z.object({
  destinationS3UriTemplate: z.string().startsWith('s3://'),
  contentType: z.string().optional().default('application/json'),
  metadataTemplate: z.record(z.string()).optional(),
});
export type S3DataSaverCustomConfig = z.infer<typeof S3DataSaverCustomConfigSchema>;