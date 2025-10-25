import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3OutputPointerWrapper, S3Pointer } from '@allma/core-types';
import { ENV_VAR_NAMES } from '@allma/core-types';
import { log_info, log_error, log_warn, log_debug } from "./logger.js";

const s3Client = new S3Client({});

const MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT = 10 * 1024; // 10KB default
const PAYLOAD_OFFLOAD_THRESHOLD_BYTES = process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES]
    ? parseInt(process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] || '', 10)
    : MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT;


/**
 * Fetches the actual data from an S3 pointer.
 */
export async function resolveS3Pointer(s3Pointer: S3Pointer, correlationId?: string): Promise<Record<string, any>> {
    log_info('Resolving S3 data pointer', { s3Pointer }, correlationId);
    try {
        const command = new GetObjectCommand({
            Bucket: s3Pointer.bucket,
            Key: s3Pointer.key,
        });
        const { Body } = await s3Client.send(command);
        if (Body) {
            const content = await Body.transformToString();
            return JSON.parse(content);
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