import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { log_info, log_error, offloadIfLarge } from '@allma/core-sdk';
import { randomUUID } from 'crypto';

interface StepInput {
  s3Bucket: string;
  s3Key: string;
  correlationId: string;
}

const textractClient = new TextractClient({});
const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_ATTEMPTS = 30; // 60 seconds total wait time

async function pollTextractJob(JobId: string): Promise<string> {
  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    const result = await textractClient.send(new GetDocumentTextDetectionCommand({ JobId }));
    
    switch (result.JobStatus) {
      case 'SUCCEEDED':
        return (result.Blocks || [])
          .filter(block => block.BlockType === 'LINE')
          .map(block => block.Text)
          .join('\n');
      case 'FAILED':
        throw new Error(`Textract job failed: ${result.StatusMessage}`);
      case 'IN_PROGRESS':
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
        break;
      default:
        throw new Error(`Unknown Textract job status: ${result.JobStatus}`);
    }
  }
  throw new Error('Textract job timed out.');
}

function sanitizeTextForLlm(text: string): string {
    return text.replace(/`/g, "'");
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step for OCR-able files (PDF, images).
 * Uses Amazon Textract to perform OCR and extract text.
 * @param event The input event from Allma, containing the S3 pointer.
 * @returns An object with the clean, sanitized text, potentially offloaded to S3.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ cleanText: string } | { _s3_output_pointer: any }> => {
  const { s3Bucket, s3Key, correlationId } = event.stepInput;
  log_info('Sanitizing OCR document', { correlationId, s3Bucket, s3Key });

  const artefactsBucket = process.env.ARTEFACTS_BUCKET;
  if (!artefactsBucket) {
      throw new Error('ARTEFACTS_BUCKET environment variable is not set.');
  }
  
  const fileExtension = s3Key.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
  if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      throw new Error(`Unsupported file type for OCR handler: ${fileExtension}`);
  }

  try {
    log_info('Starting Textract job', { correlationId });
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
    });
    const startResponse = await textractClient.send(startCommand);
    if (!startResponse.JobId) {
      throw new Error('Failed to start Textract job.');
    }

    const rawText = await pollTextractJob(startResponse.JobId);
    log_info('Successfully extracted text via Textract', { correlationId });
    
    const cleanText = sanitizeTextForLlm(rawText);

    const result = await offloadIfLarge(
        { cleanText }, 
        `sanitized-output/${correlationId}-${randomUUID()}.json`,
        artefactsBucket,
        correlationId
    );
    
    if (!result) {
        throw new Error('offloadIfLarge returned an undefined result.');
    }
    return result as { cleanText: string } | { _s3_output_pointer: any };

  } catch (error) {
    log_error('Failed to sanitize OCR document', { correlationId, error });
    throw error;
  }
};