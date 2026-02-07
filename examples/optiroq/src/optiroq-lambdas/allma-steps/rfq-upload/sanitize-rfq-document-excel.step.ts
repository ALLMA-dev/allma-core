import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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

function sanitizeTextForLlm(text: string): string {
    return text.replace(/`/g, "'");
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step specialized for Excel files.
 * Extracts all text content from an .xlsx, .xls, or .xlsm file.
 * @param event The input event from Allma, containing the S3 pointer.
 * @returns An object with the clean, sanitized text, potentially offloaded to S3.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ cleanText: string } | { _s3_output_pointer: any }> => {
    const { s3Bucket, s3Key, correlationId } = event.stepInput;
    log_info('Sanitizing Excel document', { correlationId, s3Bucket, s3Key });

    const artefactsBucket = process.env.ARTEFACTS_BUCKET;
    if (!artefactsBucket) {
        throw new Error('ARTEFACTS_BUCKET environment variable is not set.');
    }

    const fileExtension = s3Key.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'xlsm') {
        throw new Error(`Unsupported file type for Excel handler: ${fileExtension}`);
    }

    try {
        const response = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
        const stream = response.Body as Readable;
        if (!stream) {
            throw new Error('S3 object body is empty.');
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.read(stream);

        let rawText = '';
        workbook.worksheets.forEach(sheet => {
            rawText += `--- SHEET: ${sheet.name} ---\n`;
            sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                const cellTexts: string[] = [];
                row.eachCell({ includeEmpty: false }, (cell) => {
                    cellTexts.push(cell.text || '');
                });
                rawText += `Row ${rowNumber}: ${cellTexts.join(' | ')}\n`;
            });
            rawText += '\n';
        });

        log_info('Successfully extracted text from Excel workbook', { correlationId });

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
        log_error('Failed to sanitize Excel document', { correlationId, error });
        throw error;
    }
};