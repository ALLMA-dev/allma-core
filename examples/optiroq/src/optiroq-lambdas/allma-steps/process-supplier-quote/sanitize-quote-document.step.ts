import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import * as ExcelJS from 'exceljs';
import { log_info, log_error, offloadIfLarge } from '@allma/core-sdk';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

interface StepInput {
  s3Bucket: string;
  s3Key: string;
  correlationId: string;
}

const s3Client = new S3Client({});
const textractClient = new TextractClient({});

const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_ATTEMPTS = 30;

function sanitizeTextForLlm(text: string): string {
    return text.replace(/`/g, "'");
}

async function pollTextractJob(JobId: string): Promise<string> {
    for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
        const result = await textractClient.send(new GetDocumentTextDetectionCommand({ JobId }));
        if (result.JobStatus === 'SUCCEEDED') {
            return (result.Blocks || []).filter(b => b.BlockType === 'LINE').map(b => b.Text).join('\n');
        }
        if (result.JobStatus === 'FAILED') throw new Error(`Textract job failed: ${result.StatusMessage}`);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    }
    throw new Error('Textract job timed out.');
}

async function handleExcel(stream: Readable): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.read(stream);
    let text = '';
    workbook.worksheets.forEach(sheet => {
        text += `--- SHEET: ${sheet.name} ---\n`;
        sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
            const values = row.values;
            const rowText = Array.isArray(values)
                ? values.slice(1).join(' | ')
                : Object.values(values).join(' | ');
            text += `Row ${rowNum}: ${rowText}\n`;
        });
        text += '\n';
    });
    return text;
}

async function handleImage(s3Bucket: string, s3Key: string): Promise<string> {
    const startCmd = new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
    });
    const startRes = await textractClient.send(startCmd);
    if (!startRes.JobId) throw new Error('Failed to start Textract job for image.');
    return pollTextractJob(startRes.JobId);
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Ingests a raw file (PDF, Excel, image), converts it to clean text, and sanitizes it.
 * This is a multi-format handler.
 * @param event The input event from Allma, containing the S3 pointer.
 * @returns An object with the clean, sanitized text.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ cleanText: string } | { _s3_output_pointer: any }> => {
  const { s3Bucket, s3Key, correlationId } = event.stepInput;
  log_info('Sanitizing document...', { correlationId, s3Bucket, s3Key });

  const artefactsBucket = process.env.ARTEFACTS_BUCKET!;
  if (!artefactsBucket) throw new Error('ARTEFACTS_BUCKET environment variable is not set.');

  const fileExtension = s3Key.split('.').pop()?.toLowerCase();
  let rawText = '';

  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
    const stream = response.Body;
    if (!stream) throw new Error('S3 object body is empty.');

    switch (fileExtension) {
      case 'xlsm':
      case 'xlsx':
      case 'xls':
        rawText = await handleExcel(stream as Readable);
        break;
      case 'pdf':
      case 'png':
      case 'jpg':
      case 'jpeg':
        rawText = await handleImage(s3Bucket, s3Key);
        break;
      default:
        throw new Error(`Unsupported file type for sanitization: ${fileExtension}`);
    }

    log_info(`Successfully extracted text from ${fileExtension} file.`, { correlationId });
    const cleanText = sanitizeTextForLlm(rawText);

    return offloadIfLarge(
      { cleanText },
      `sanitized-output/${correlationId}-${randomUUID()}.json`,
      artefactsBucket,
      correlationId
    ) as Promise<{ cleanText: string } | { _s3_output_pointer: any }>;

  } catch (error) {
    log_error('Failed to sanitize document', { correlationId, error });
    throw error;
  }
};