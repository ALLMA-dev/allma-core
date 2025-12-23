import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import {
  FlowRuntimeState,
  StepHandler,
  StepHandlerOutput,
  TransientStepError,
  S3DataSaverCustomConfigSchema,
  StepDefinition
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const s3Client = new S3Client({});

// This schema validates the entire *input object* received by the handler,
// which is a combination of the static customConfig and the dynamic inputMappings.
// The `step-executor` has already rendered the templates, so we expect the final values.
const S3SaverInputSchema = S3DataSaverCustomConfigSchema.extend({
  contentToSave: z.any().describe("The content to be saved to S3, provided via inputMappings."),
});


/**
 * A generic data-saving module that saves a payload to a specified S3 location.
 * This handler now expects a fully-rendered input object, with all templates resolved.
 */
export const executeS3Saver: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  // The stepInput here is the combined and fully rendered result of customConfig and resolved inputMappings.
  const validationResult = S3SaverInputSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/s3-data-saver module.", { errors: validationResult.error.flatten(), receivedInput: stepInput }, correlationId);
    throw new Error(`Invalid input for S3 Saver: ${validationResult.error.message}`);
  }

  const config = validationResult.data;
  const { contentToSave } = config;

  // The destination URI is already fully rendered by the step-executor.
  const renderedS3Uri = config.destinationS3UriTemplate;

  const uriMatch = renderedS3Uri.match(/^s3:\/\/([^/]+)\/(.*)$/);
  if (!uriMatch) {
    throw new Error(`Invalid S3 URI format after rendering: ${renderedS3Uri}`);
  }
  const [, Bucket, Key] = uriMatch;

  log_info(`Saving data to S3`, { bucket: Bucket, key: Key }, correlationId);

  if (contentToSave === undefined) {
    throw new Error(`The 'contentToSave' input was undefined. Nothing to save.`);
  }

  // Prepare the body for S3. If the content is an object/array, stringify it.
  // If the content type suggests it's binary and the input is a string, assume it's base64 and decode.
  let Body: string | Buffer;
  
  const contentType = config.contentType.toLowerCase();
  // A type is considered text-based if it starts with 'text/', is a known JSON, XML, or script variant.
  // This prevents overly broad matches on types like '...openxmlformats...'.
  const isTextBased = contentType.startsWith('text/') ||
                      /(application|text)\/(json|javascript|xml)/.test(contentType) ||
                      /\+(json|xml)$/.test(contentType);
  
  const isLikelyBinary = !isTextBased;

  if (typeof contentToSave === 'string' && isLikelyBinary) {
    log_info('Content is a string and content type is likely binary; attempting to decode from base64.', { contentType: config.contentType }, correlationId);
    Body = Buffer.from(contentToSave, 'base64');
  } else if (typeof contentToSave === 'string') {
    Body = contentToSave;
  } else {
    // If content is not a string (e.g., an object or array), it should be saved as JSON text.
    Body = JSON.stringify(contentToSave, null, 2);
  }

  // The metadata is already rendered by the step-executor.
  const Metadata = config.metadataTemplate;
  
  const command = new PutObjectCommand({
    Bucket,
    Key,
    Body,
    ContentType: config.contentType,
    Metadata: Metadata as Record<string, string>,
  });

  try {
    const result = await s3Client.send(command);
    
    // MODIFIED: Construct outputData by conditionally adding optional properties
    // to satisfy exactOptionalPropertyTypes: true.
    const outputData: {
        s3Uri: string;
        bucket: string;
        key: string;
        eTag?: string;
        versionId?: string;
        _meta: Record<string, any>;
    } = {
      s3Uri: renderedS3Uri,
      bucket: Bucket,
      key: Key,
      _meta: { 
        status: 'SUCCESS',
        s3_params: { Bucket, Key, ContentType: config.contentType },
      },
    };

    // Only add eTag if it's explicitly a string
    if (result.ETag) {
        outputData.eTag = result.ETag;
    }
    // Only add versionId if it's explicitly a string
    if (result.VersionId) {
        outputData.versionId = result.VersionId;
    }

    return { outputData };

  } catch (error: any) {
    log_error(`Failed to put object to S3 at: ${renderedS3Uri}`, { error: error.message, name: error.name }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException'].includes(error.name)) {
      throw new TransientStepError(`S3 PutObject failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};