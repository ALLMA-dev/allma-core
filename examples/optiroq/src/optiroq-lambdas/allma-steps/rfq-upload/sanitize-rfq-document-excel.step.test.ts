import { handler } from './sanitize-rfq-document-excel.step';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
  offloadIfLarge: jest.fn((data) => Promise.resolve(data)),
}));

const s3Mock = mockClient(S3Client);

describe('sanitize-rfq-document-excel handler', () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
    process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';
  });

  afterEach(() => {
    delete process.env.ARTEFACTS_BUCKET;
  });

  it('should correctly parse an Excel file and return sanitized text', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RFQ Data');
    sheet.addRow(['Project:', 'Project `X`']);
    sheet.addRow(['Part', 'Quantity']);
    sheet.addRow(['Bolt-A', 100]);
    const buffer = await workbook.xlsx.writeBuffer();
    
    const stream = sdkStreamMixin(Readable.from([Buffer.from(buffer)]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'test.xlsx', correlationId: 'corr-excel' } };
    const result = await handler(event);

    const expectedText = "--- SHEET: RFQ Data ---\nRow 1: Project: | Project 'X'\nRow 2: Part | Quantity\nRow 3: Bolt-A | 100\n\n";
    expect(result).toEqual({ cleanText: expectedText });
  });

  it('should throw an error for non-Excel file types', async () => {
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'document.pdf', correlationId: 'corr-excel-fail' } };
    
    await expect(handler(event)).rejects.toThrow('Unsupported file type for Excel handler: pdf');
  });

  it('should throw an error if ARTEFACTS_BUCKET is not set', async () => {
    delete process.env.ARTEFACTS_BUCKET;
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'test.xlsx', correlationId: 'corr-excel' } };
    await expect(handler(event)).rejects.toThrow('ARTEFACTS_BUCKET environment variable is not set.');
  });
});