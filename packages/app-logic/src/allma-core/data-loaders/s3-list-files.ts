import { S3Client, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3';
import { z } from 'zod';
import {
    FlowRuntimeState,
    StepHandler,
    StepHandlerOutput,
    TransientStepError,
    StepDefinition,
    S3OutputPointerWrapper,
} from '@allma/core-types';
import { log_error, log_info, log_debug } from '@allma/core-sdk';

const s3Client = new S3Client({});

// Local Zod schema for validating the combined input for this specific module.
const S3ListFilesInputSchema = z.object({
    bucket: z.string().min(1, 'S3 bucket name is required.'),
    prefix: z.string().optional(),
    maxKeys: z.number().int().positive().optional(),
});

/**
 * A standard StepHandler for listing files from an S3 bucket and prefix.
 * It handles pagination automatically and formats the output for seamless consumption
 * by downstream steps that support automatic S3 pointer hydration.
 */
export const handleS3ListFiles: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>, // This is the combinedInput
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  const configParseResult = S3ListFilesInputSchema.safeParse(stepInput);
  if (!configParseResult.success) {
    log_error("Invalid stepInput for system/s3-list-files.", { 
        errors: configParseResult.error.flatten(),
        receivedInput: stepInput
    }, correlationId);
    throw new Error(`Invalid stepInput for s3-list-files: ${configParseResult.error.message}`);
  }
  const config = configParseResult.data;

  log_info(`Listing files from S3`, { bucket: config.bucket, prefix: config.prefix, maxKeys: config.maxKeys }, correlationId);

  const allFiles: _Object[] = [];
  let continuationToken: string | undefined;
  let isTruncated = true;

  try {
    while (isTruncated && (!config.maxKeys || allFiles.length < config.maxKeys)) {
      const command = new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: config.prefix,
        ContinuationToken: continuationToken,
        // Request the S3 default (1000) or a smaller number if the remaining keys are less than 1000.
        MaxKeys: config.maxKeys ? Math.min(1000, config.maxKeys - allFiles.length) : undefined,
      });

      const response = await s3Client.send(command);
      
      if (response.Contents) {
        // Filter out S3 "directory" objects which have a size of 0.
        const filesOnly = response.Contents.filter(item => item.Size !== 0);
        allFiles.push(...filesOnly);
      }

      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;

      log_debug(`S3 ListObjectsV2 page fetched.`, { count: response.KeyCount, isTruncated }, correlationId);
    }

    // Format the output to be maximally useful for downstream steps.
    // Each file object includes metadata AND a standard S3 pointer wrapper.
    // This allows steps like PARALLEL_FORK_MANAGER to iterate over the files,
    // and for steps within the branch to automatically hydrate the file content
    // by referencing `$.currentItem.content`.
    const formattedFiles = allFiles.map(file => {
      const s3PointerWrapper: S3OutputPointerWrapper = {
        _s3_output_pointer: {
          bucket: config.bucket,
          key: file.Key!,
        }
      };
      
      return {
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified?.toISOString(),
        eTag: file.ETag,
        bucket: config.bucket,
        // This 'content' field is the magic. The runtime's `hydrateInputFromS3Pointers`
        // utility will automatically see this wrapper and replace it with the
        // actual file content from S3.
        content: s3PointerWrapper,
      };
    });
    
    log_info(`Successfully listed ${formattedFiles.length} files from S3.`, {}, correlationId);

    return {
      outputData: {
        files: formattedFiles,
        fileCount: formattedFiles.length,
      },
    };
  } catch (error: any) {
    log_error(`S3 ListObjectsV2 operation failed.`, { bucket: config.bucket, prefix: config.prefix, error: error.message }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException', 'InternalError'].includes(error.name)) {
      throw new TransientStepError(`S3 operation failed due to a transient error: ${error.message}`);
    }
    // Errors like NoSuchBucket or AccessDenied are permanent configuration issues.
    throw error;
  }
};