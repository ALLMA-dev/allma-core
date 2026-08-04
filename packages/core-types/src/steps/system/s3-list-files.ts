import { z } from 'zod';

/**
 * Configuration for the `system/s3-list-files` data-loader module, which lists
 * objects under an S3 bucket/prefix (handling pagination). Centralized from the
 * runtime handler so every authoring surface validates it from one schema.
 */
export const S3ListFilesCustomConfigSchema = z.object({
  bucket: z.string().min(1, 'S3 bucket name is required.'),
  prefix: z.string().optional(),
  maxKeys: z.number().int().positive().optional(),
});
export type S3ListFilesCustomConfig = z.infer<typeof S3ListFilesCustomConfigSchema>;
