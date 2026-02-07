import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { log_error } from '@allma/core-sdk';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.ARTEFACTS_BUCKET;
const URL_EXPIRATION_SECONDS = 900; // 15 minutes

/**
 * Generates a short-lived, pre-signed GET URL for a private S3 object.
 * This is a shared utility for API handlers.
 * @param key The S3 object key.
 * @returns A promise that resolves to the pre-signed URL, or an empty string on failure.
 */
export const generatePresignedGetUrl = async (key: string): Promise<string> => {
  if (!key) return '';
  if (!BUCKET_NAME) {
    log_error('S3 URL generation failed: ARTEFACTS_BUCKET is not configured.');
    return '';
  }
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION_SECONDS });
  } catch (error) {
    log_error('Failed to generate pre-signed GET URL', { key, error });
    return ''; // Return empty string on failure.
  }
};