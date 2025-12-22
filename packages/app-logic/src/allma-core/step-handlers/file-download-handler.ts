import {
    StepHandler,
    StepHandlerOutput,
    StepDefinition,
    FlowRuntimeState,
    FileDownloadStepPayloadSchema,
    TransientStepError,
    S3Pointer,
    ENV_VAR_NAMES,
} from '@allma/core-types';
import { log_info, log_error, log_debug } from '@allma/core-sdk';
import { TemplateService } from '../template-service.js';
import axios from 'axios';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { JSONPath } from 'jsonpath-plus';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});
const DEFAULT_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME];

/**
 * Handles the FILE_DOWNLOAD step.
 * Streams data from a source URL directly to S3 using the @aws-sdk/lib-storage Upload utility.
 * This ensures robust handling of streams even when Content-Length is unknown or the file is large.
 */
export const handleFileDownload: StepHandler = async (
    stepDefinition: StepDefinition,
    stepInput: Record<string, any>,
    runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
    const correlationId = runtimeState.flowExecutionId;

    // 1. Validation
    const validationResult = FileDownloadStepPayloadSchema.safeParse(stepDefinition);
    if (!validationResult.success) {
        log_error('Invalid configuration for FILE_DOWNLOAD step', { errors: validationResult.error.flatten() }, correlationId);
        throw new Error('Invalid StepDefinition for FILE_DOWNLOAD: ' + validationResult.error.message);
    }
    const config = validationResult.data;

    // 2. Context Preparation & Templating
    const templateService = TemplateService.getInstance();
    const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };

    // Render URL
    const sourceUrl = await templateService.render(config.sourceUrlTemplate, templateContext, correlationId);
    
    // Render Destination Key
    let destinationKey: string;
    if (config.destinationKeyTemplate) {
        destinationKey = await templateService.render(config.destinationKeyTemplate, templateContext, correlationId);
    } else {
        destinationKey = `downloads/${runtimeState.flowExecutionId}/${runtimeState.currentStepInstanceId}/${uuidv4()}`;
    }

    const destinationBucket = config.destinationBucket || DEFAULT_BUCKET_NAME;
    if (!destinationBucket) {
        throw new Error('Destination bucket is not configured. Set destinationBucket or ensure ALLMA_EXECUTION_TRACES_BUCKET_NAME is set.');
    }

    // Build Headers
    const headers: Record<string, string> = {};
    if (config.headersTemplate) {
        for (const [headerName, jsonPath] of Object.entries(config.headersTemplate)) {
            const val = JSONPath({ path: jsonPath, json: templateContext, wrap: false });
            if (val !== undefined && val !== null) {
                headers[headerName] = String(val);
            }
        }
    }

    log_info(`Starting file download`, { sourceUrl, destinationBucket, destinationKey, method: config.method }, correlationId);

    try {
        // 3. Request Stream
        const response = await axios({
            method: config.method || 'GET',
            url: sourceUrl,
            headers: headers,
            responseType: 'stream',
            timeout: config.customConfig?.timeoutMs || 30000,
            validateStatus: (status) => status >= 200 && status < 300,
            ...(config.customConfig?.verifySsl === false && {
                httpsAgent: new (await import('https')).Agent({ rejectUnauthorized: false }) 
            })
        });

        // 4. Stream to S3 using Upload
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const contentLength = response.headers['content-length'];

        // Use Upload instead of PutObjectCommand to handle streaming correctly
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: destinationBucket,
                Key: destinationKey,
                Body: response.data,
                ContentType: contentType,
                Metadata: {
                    sourceUrl: sourceUrl,
                    originalName: sourceUrl.split('/').pop() || 'unknown',
                }
            },
            // Optional: concurrency configuration for performance on large files
            queueSize: 4, 
            partSize: 1024 * 1024 * 5, // 5MB
            leavePartsOnError: false, 
        });

        await upload.done();

        log_info(`File download completed successfully.`, { key: destinationKey, size: contentLength }, correlationId);

        // 5. Construct Output
        const s3Pointer: S3Pointer = {
            bucket: destinationBucket,
            key: destinationKey,
        };

        return {
            outputData: {
                filePointer: s3Pointer, // For manual reference
                // Standard wrapper for auto-hydration in downstream steps
                content: { _s3_output_pointer: s3Pointer }, 
                contentType: contentType,
                contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
                _meta: {
                    status: 'SUCCESS',
                    sourceUrl: sourceUrl,
                }
            }
        };

    } catch (error: any) {
        log_error(`File download failed`, { sourceUrl, error: error.message }, correlationId);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status && error.response.status >= 500) {
                throw new TransientStepError(`Download failed with server error: ${error.response.status}`);
            }
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw new TransientStepError(`Download timed out.`);
            }
        }
        
        if (error.name === 'TimeoutError' || error.name === 'RequestTimeout') {
             throw new TransientStepError(`S3 Upload timed out: ${error.message}`);
        }

        throw error;
    }
};