import {
  FlowRuntimeState,
  S3DataLoaderCustomConfigSchema,
  S3DataLoaderOutputFormat,
  S3DataLoaderOnMissingBehavior,
  TransientStepError,
  StepHandler,
  StepDefinition,
} from '@allma/core-types';
import { log_error, log_info, log_warn } from '@allma/core-sdk';
import { S3Client, GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({}); // Singleton S3 client for default region

const streamToString = (stream: Readable, encoding: BufferEncoding): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)));
  });

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

/**
 * A standard StepHandler for fetching and processing data from S3.
 * It reads its specific configuration from the stepInput, which is a combination
 * of the step's customConfig and the dynamic input from the previous step.
 */
export const handleS3DataLoader: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>, // This is now the combinedInput
  runtimeState: FlowRuntimeState,
) => {
  const correlationId = runtimeState.flowExecutionId;

  // 1. Validate the combined input for this module.
  // The stepInput now contains the fully rendered and merged configuration.
  const configParseResult = S3DataLoaderCustomConfigSchema.safeParse(stepInput);
  if (!configParseResult.success) {
    log_error("Invalid stepInput for system/s3-data-loader.", { errors: configParseResult.error.flatten() }, correlationId);
    throw new Error(`Invalid stepInput for s3-data-loader: ${configParseResult.error.message}`);
  }
  const config = configParseResult.data;

  // 2. The sourceS3Uri is now expected to be fully rendered.
  const renderedS3Uri = config.sourceS3Uri;

  log_info(`Executing S3 Data Loader for URI: ${renderedS3Uri}`, {}, correlationId);

  const uriMatch = renderedS3Uri.match(/^s3:\/\/([^/]+)\/(.*)$/);
  if (!uriMatch) {
    throw new Error(`Invalid S3 URI format: ${renderedS3Uri}`);
  }
  const [, Bucket, Key] = uriMatch;

  let s3Response: GetObjectCommandOutput;
  try {
    const getObjectCommand = new GetObjectCommand({ Bucket, Key });
    const client = config.region ? new S3Client({ region: config.region }) : s3Client;
    s3Response = await client.send(getObjectCommand);
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      if (config.onMissing === S3DataLoaderOnMissingBehavior.IGNORE) {
        log_warn(`S3 object not found, but onMissing is IGNORE. Continuing.`, { bucket: Bucket, key: Key }, correlationId);
        return { outputData: { content: null, _meta: { found: false } } };
      } else {
        log_error(`S3 object not found and onMissing is FAIL.`, { bucket: Bucket, key: Key }, correlationId);
        throw error;
      }
    } else if (error.name === 'AccessDenied') {
      log_error(`S3 Access Denied. Check Lambda IAM permissions.`, { bucket: Bucket, key: Key }, correlationId);
      throw error;
    } else {
      log_error('An unexpected S3 error occurred.', { error: error.message, name: error.name }, correlationId);
      throw new TransientStepError(`S3 GetObject failed: ${error.message}`);
    }
  }

  if (!s3Response.Body || !(s3Response.Body instanceof Readable)) {
    throw new Error('S3 response body is empty or not a readable stream.');
  }

  let content: any;
  try {
    switch (config.outputFormat) {
      case S3DataLoaderOutputFormat.JSON: {
        const jsonString = await streamToString(s3Response.Body, config.encoding as BufferEncoding);
        content = JSON.parse(jsonString);
        break;
      }
      case S3DataLoaderOutputFormat.RAW_BUFFER: {
        const buffer = await streamToBuffer(s3Response.Body);
        content = buffer.toString('base64');
        break;
      }
      case S3DataLoaderOutputFormat.TEXT:
      default: {
        content = await streamToString(s3Response.Body, config.encoding as BufferEncoding);
        break;
      }
    }
  } catch (parseError: any) {
    if (config.outputFormat === 'JSON' && parseError instanceof SyntaxError) {
      throw new Error(`InvalidOutputFormat: Failed to parse S3 object content as JSON. Error: ${parseError.message}`);
    }
    throw parseError;
  }

  return {
    outputData: {
      content: content,
      _meta: {
        found: true,
        sourceS3Uri: renderedS3Uri,
        contentType: s3Response.ContentType,
        contentLength: s3Response.ContentLength,
        eTag: s3Response.ETag,
      }
    }
  };
};
