import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { log_info, log_error } from '@allma/core-sdk';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.ARTEFACTS_BUCKET;
const URL_EXPIRATION_SECONDS = 3600 * 24 * 7; // Links are valid for 7 days

interface AttachmentInfo {
  filename: string;
  s3key: string;
}

interface StepInput {
  attachments: AttachmentInfo[];
  correlationId: string;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Takes an array of S3 attachment objects, generates pre-signed GET URLs for each,
 * and returns a formatted text block of download links.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ linksText: string }> => {
  const { attachments, correlationId } = event.stepInput;
  log_info('Generating pre-signed URLs for email attachments', { correlationId, count: attachments?.length || 0 });

  if (!BUCKET_NAME) {
    throw new Error('ARTEFACTS_BUCKET environment variable is not set.');
  }

  if (!attachments || attachments.length === 0) {
    return { linksText: 'No attachments included.' };
  }

  try {
    const linkPromises = attachments.map(async (att) => {
      if (!att.s3key || !att.filename) {
        log_error('Invalid attachment object found, skipping.', { correlationId, attachment: att });
        return null;
      }
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: att.s3key,
        // This header ensures the browser will prompt for download with the original filename
        ResponseContentDisposition: `attachment; filename="${att.filename}"`
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION_SECONDS });
      return `* ${att.filename}:\n  ${url}`;
    });

    const links = (await Promise.all(linkPromises)).filter(Boolean);
    const linksText = links.join('\n\n');
    
    log_info('Successfully generated attachment links', { correlationId });
    return { linksText };

  } catch (error) {
    log_error('Failed to generate pre-signed URLs for attachments', { correlationId, error });
    // On failure, return a user-friendly message to be included in the email.
    return { linksText: 'There was an error generating attachment links. Please contact support to receive the files.' };
  }
};