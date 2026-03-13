import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3OutputPointerWrapper, S3Pointer } from '@allma/core-types';
import { ENV_VAR_NAMES, isS3OutputPointerWrapper } from '@allma/core-types';
import { log_info, log_error, log_warn, log_debug } from "./logger.js";
import { isObject } from './objectUtils.js';

// Configure S3 client with adaptive retry mode to gracefully handle rate limit exhaustion (429/503 Slow Down)
const s3Client = new S3Client({ maxAttempts: 10, retryMode: 'adaptive' });

const MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT = 10 * 1024; // 10KB default
const PAYLOAD_OFFLOAD_THRESHOLD_BYTES = process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES]
    ? parseInt(process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] || '', 10)
    : MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT;


/**
 * Fetches the actual data from an S3 pointer.
 * It inspects the S3 object's Content-Type to determine how to process the data.
 * If the object exceeds 4MB and skipSizeLimit is false, it returns a presigned URL.
 * Defaults skipSizeLimit to true, as most calls are internal engine hydration. UI endpoints must explicitly pass false.
 */
export async function resolveS3Pointer(s3Pointer: S3Pointer, correlationId?: string, skipSizeLimit: boolean = true): Promise<any> {
    log_info('Resolving S3 data pointer', { s3Pointer }, correlationId);
    try {
        const command = new GetObjectCommand({
            Bucket: s3Pointer.bucket,
            Key: s3Pointer.key,
        });
        const response = await s3Client.send(command);
        
        if (response.Body) {
            const contentLength = response.ContentLength || 0;
            const INLINE_HYDRATION_LIMIT = 4 * 1024 * 1024; // 4MB safe inline hydration limit

            if (!skipSizeLimit && contentLength > INLINE_HYDRATION_LIMIT) {
                log_info(`S3 object is too large (${contentLength} bytes) for inline hydration. Generating presigned URL.`, { s3Pointer }, correlationId);
                
                // Properly release/destroy the stream so we don't leak memory or connections
                if (typeof (response.Body as any).destroy === 'function') {
                    (response.Body as any).destroy();
                }

                const presignCommand = new GetObjectCommand({
                    Bucket: s3Pointer.bucket,
                    Key: s3Pointer.key,
                });
                
                const signedUrl = await getSignedUrl(s3Client, presignCommand, { expiresIn: 3600 }); // 1 hour
                
                return {
                    _is_large_s3_payload: true,
                    s3Pointer,
                    sizeBytes: contentLength,
                    contentType: response.ContentType,
                    presignedUrl: signedUrl,
                    message: "Payload is too large to display inline. Use the provided link to view or download it securely."
                };
            }

            const contentType = response.ContentType || 'application/octet-stream';
            const isTextContent = contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml');

            if (isTextContent) {
                const content = await response.Body.transformToString();
                try {
                    // This handles cases where the S3 object is a JSON document
                    return JSON.parse(content);
                } catch (jsonError) {
                    // This handles plain text files
                    log_debug('S3 content is text-based but not JSON, returning as raw string.', { key: s3Pointer.key, contentType }, correlationId);
                    return content;
                }
            } else {
                // This handles binary files (images, PDFs, Excel files, etc.)
                log_debug('S3 content is binary, returning as base64 encoded string.', { key: s3Pointer.key, contentType }, correlationId);
                const byteArray = await response.Body.transformToByteArray();
                return Buffer.from(byteArray).toString('base64');
            }
        }
        throw new Error('S3 object body for data pointer is empty.');
    } catch (e: any) {
        log_error('Failed to fetch or parse data from S3 pointer', { s3Pointer, error: e.message }, correlationId);
        throw new Error(`Failed to resolve S3 data pointer: ${e.message}`);
    }
}

/**
 * Checks the size of a payload and offloads it to S3 if it exceeds the defined threshold.
 * This is a generic utility for any Lambda to use for its return payload.
 *
 * @param payload The object to potentially offload.
 * @param bucketName The S3 bucket to upload to.
 * @param keyPrefix A prefix for the S3 key (e.g., 'step_outputs/flow-id/step-id').
 * @param correlationId For logging.
 * @param thresholdBytes The size threshold to trigger offloading. Defaults to the configured environment variable.
 * @returns The original payload if it's small, or an S3OutputPointerWrapper if it was offloaded.
 */
export async function offloadIfLarge(
    payload: Record<string, any> | undefined,
    bucketName: string,
    keyPrefix: string,
    correlationId: string,
    thresholdBytes: number = PAYLOAD_OFFLOAD_THRESHOLD_BYTES
): Promise<Record<string, any> | S3OutputPointerWrapper | undefined> {

    if (!payload) return undefined;

    // Add a guard to prevent re-offloading an object that is already a pointer.
    // This stops the creation of nested `_s3_output_pointer` objects.
    if (isS3OutputPointerWrapper(payload)) {
        log_debug('Payload is already an S3 output pointer. Skipping offload check.', { keyPrefix }, correlationId);
        return payload;
    }

    try {
        const payloadString = JSON.stringify(payload);
        const payloadSize = Buffer.byteLength(payloadString, 'utf-8');

        log_debug(`offloadIfLarge for ${bucketName} ${keyPrefix}...`, { thresholdBytes }, correlationId);

        if (payloadSize > thresholdBytes) {
            const s3Key = `${keyPrefix}_${new Date().toISOString()}.json`;
            log_warn(`Payload is large (${payloadSize} bytes). Offloading to S3.`, { s3Key, thresholdBytes }, correlationId);

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
                Body: payloadString,
                ContentType: 'application/json',
            }));

            const s3Pointer: S3Pointer = { bucket: bucketName, key: s3Key };
            return { _s3_output_pointer: s3Pointer }; // Return the wrapper
        }

        // Payload is small enough, return as is
        return payload;

    } catch (e: any) {
        log_error(`Failed to offload payload to S3 for key prefix '${keyPrefix}'`, { error: e.message }, correlationId);
        throw new Error(`Failed during S3 offload attempt: ${e.message}`);
    }
}


/**
 * Recursively traverses a data structure (object or array) and offloads any field
 * whose value exceeds a size threshold to S3, replacing it with an S3 pointer.
 */
export async function recursivelyOffloadLargeFields(
    data: any,
    bucketName: string,
    keyPrefix: string,
    correlationId: string,
    thresholdBytes: number
): Promise<any> {
    if (Array.isArray(data)) {
        // Process each item in the array recursively.
        return Promise.all(
            data.map((item, index) => 
                recursivelyOffloadLargeFields(item, bucketName, `${keyPrefix}/${index}`, correlationId, thresholdBytes)
            )
        );
    }

    if (isObject(data)) {
        // Do not process S3 pointers themselves.
        if (isS3OutputPointerWrapper(data)) {
            return data;
        }

        const newObject: Record<string, any> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                
                try {
                    // Gracefully skip properties with an 'undefined' value.
                    // These properties are omitted in JSON.stringify and cause Buffer.byteLength to fail.
                    if (value === undefined) {
                        continue;
                    }

                    // First, check the size of the value.
                    const valueString = (typeof value === 'string') ? value : JSON.stringify(value);
                    const valueSize = Buffer.byteLength(valueString, 'utf-8');

                    if (valueSize > thresholdBytes) {
                        // Value is large, offload it.
                        log_warn(`Field '${key}' in '${keyPrefix}' is large (${valueSize} bytes), offloading to S3.`, { }, correlationId);
                        
                        const isString = typeof value === 'string';
                        const s3Key = `${keyPrefix}/${key}_${new Date().toISOString()}.${isString ? 'txt' : 'json'}`;
                        await s3Client.send(new PutObjectCommand({
                            Bucket: bucketName,
                            Key: s3Key,
                            Body: valueString,
                            ContentType: isString ? 'text/plain' : 'application/json',
                        }));
                        
                        const s3Pointer: S3Pointer = { bucket: bucketName, key: s3Key };
                        newObject[key] = { _s3_output_pointer: s3Pointer };

                    } else {
                        // Value is small enough, recurse into it in case it contains large nested fields.
                        newObject[key] = await recursivelyOffloadLargeFields(
                            value,
                            bucketName,
                            `${keyPrefix}/${key}`, // a more descriptive path for nested objects
                            correlationId,
                            thresholdBytes
                        );
                    }
                } catch(e: any) {
                    log_error(`Error processing field '${key}' during recursive offload. Replacing with error message.`, { error: e.message }, correlationId);
                    newObject[key] = { _offload_error: `Failed to process or serialize field: ${e.message}`};
                }
            }
        }
        return newObject;
    }

    // It's a primitive (string, number, boolean, null)
    if (typeof data === 'string') {
        const valueSize = Buffer.byteLength(data, 'utf-8');
        if (valueSize > thresholdBytes) {
             log_warn(`String value at path '${keyPrefix}' is large (${valueSize} bytes), offloading to S3.`, {}, correlationId);
             const s3Key = `${keyPrefix}_${new Date().toISOString()}.txt`;
             await s3Client.send(new PutObjectCommand({
                 Bucket: bucketName,
                 Key: s3Key,
                 Body: data,
                 ContentType: 'text/plain',
             }));
             const s3Pointer: S3Pointer = { bucket: bucketName, key: s3Key };
             return { _s3_output_pointer: s3Pointer };
        }
    }

    return data; // Return other primitives as-is
}