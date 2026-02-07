import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from './lib/api-response.js';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { log_error } from '@allma/core-sdk';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.ARTEFACTS_BUCKET;
const UPLOAD_EXPIRATION_SECONDS = 300; // URL is valid for 5 minutes

/**
 * @description API handler for POST /files/upload-url.
 * Generates a secure, pre-signed S3 URL for clients to upload files directly.
 * Now accepts an optional 'prefix' to organize uploads.
 * @param event The API Gateway event.
 * @returns A pre-signed URL and the corresponding S3 key.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('GetUploadUrl handler received event:', JSON.stringify(event, null, 2));

  if (!BUCKET_NAME) {
    log_error('ARTEFACTS_BUCKET environment variable not set.');
    return createErrorResponse(event, new Error('Server configuration error.'), 500);
  }

  try {
    if (!event.body) {
      throw new Error('Request body is missing.');
    }
    const { fileName, fileType, prefix } = JSON.parse(event.body);
    if (!fileName || !fileType) {
      throw new Error('Request body must include fileName and fileType.');
    }

    const pathPrefix = prefix || 'general-uploads';
    // Generate a unique key to prevent file name collisions.
    const key = `${pathPrefix}/${randomUUID()}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION_SECONDS,
    });

    const responseData = {
      uploadUrl,
      key,
      bucket: BUCKET_NAME,
    };

    return createSuccessResponse(event, responseData);
  } catch (error) {
    log_error('Error generating pre-signed URL', { error });
    // Return a 400 for client-side errors like bad JSON
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return createErrorResponse(event, error, statusCode);
  }
};