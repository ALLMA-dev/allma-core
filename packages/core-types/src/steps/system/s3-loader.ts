import { z } from 'zod';

export enum S3DataLoaderOutputFormat {
  JSON = 'JSON',
  TEXT = 'TEXT',
  RAW_BUFFER = 'RAW_BUFFER',
}
export const S3DataLoaderOutputFormatSchema = z.nativeEnum(S3DataLoaderOutputFormat);

export enum S3DataLoaderOnMissingBehavior {
  FAIL = 'FAIL',
  IGNORE = 'IGNORE',
}
export const S3DataLoaderOnMissingBehaviorSchema = z.nativeEnum(S3DataLoaderOnMissingBehavior);

/**
 * Defines the configuration for the S3 data loader module.
 */
export const S3DataLoaderCustomConfigSchema = z.object({
  sourceS3Uri: z.string().startsWith('s3://'),
  outputFormat: S3DataLoaderOutputFormatSchema.optional().default(S3DataLoaderOutputFormat.TEXT),
  encoding: z.string().optional().default('utf-8'),
  region: z.string().optional(),
  onMissing: S3DataLoaderOnMissingBehaviorSchema.optional().default(S3DataLoaderOnMissingBehavior.FAIL),
});
export type S3DataLoaderCustomConfig = z.infer<typeof S3DataLoaderCustomConfigSchema>;