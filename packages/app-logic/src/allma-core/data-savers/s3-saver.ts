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
import { TemplateService } from '../template-service.js';
import { renderNestedTemplates } from '../utils/template-renderer.js';

const s3Client = new S3Client({});

// This schema validates the entire *input object* received by the handler,
// which is a combination of the static customConfig and the dynamic inputMappings.
const S3SaverInputSchema = S3DataSaverCustomConfigSchema.extend({
  contentToSave: z.any().describe("The content to be saved to S3, provided via inputMappings."),
});


/**
 * A generic data-saving module that saves a payload to a specified S3 location.
 * This handler now expects its data via `inputMappings` and its configuration via `customConfig`.
 */
export const executeS3Saver: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  // The stepInput here is the combined result of customConfig and resolved inputMappings.
  const validationResult = S3SaverInputSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/s3-data-saver module.", { errors: validationResult.error.flatten(), receivedInput: stepInput }, correlationId);
    throw new Error(`Invalid input for S3 Saver: ${validationResult.error.message}`);
  }

  const config = validationResult.data;
  const { contentToSave } = config;

  // Render the destination URI template
  const templateService = TemplateService.getInstance();
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
  const renderedS3Uri = templateService.render(config.destinationS3UriTemplate, templateContext);

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
  const isLikelyBinary = !config.contentType.startsWith('text/') && !/json/.test(config.contentType) && !/xml/.test(config.contentType);

  if (typeof contentToSave === 'string' && isLikelyBinary) {
    log_info('Content is a string and content type is binary; attempting to decode from base64.', { contentType: config.contentType }, correlationId);
    Body = Buffer.from(contentToSave, 'base64');
  } else if (typeof contentToSave === 'string') {
    Body = contentToSave;
  } else {
    Body = JSON.stringify(contentToSave, null, 2);
  }

  // Render metadata templates
  const Metadata = config.metadataTemplate
    ? await renderNestedTemplates(config.metadataTemplate, templateContext, correlationId)
    : undefined;
  
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