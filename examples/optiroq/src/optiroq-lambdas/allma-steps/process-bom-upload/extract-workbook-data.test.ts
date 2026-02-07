import { handler } from './extract-workbook-data.step';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { WorkbookExtractionResult } from '@optiroq/types';

// Mock the core-sdk logger to avoid dependency issues in tests
jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
}));

const s3Mock = mockClient(S3Client);

describe('extract-workbook-data handler', () => {
  beforeEach(() => {
    s3Mock.reset();
    process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';
  });

  afterEach(() => {
    delete process.env.ARTEFACTS_BUCKET;
  });

  // Helper to create an in-memory Excel buffer for tests
  async function createMockExcelBuffer(workbookSetup: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbookSetup(workbook);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  it('should return both summary and full data for a simple Excel file', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('BOM Data');
      sheet.addRow(['Project:', 'Project Phoenix']);
      sheet.addRow([]); // Empty row
      sheet.addRow(['Part Name', 'Material', 'Quantity']);
      sheet.addRow(['Part-A', 'Steel', 100]);
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'test.xlsx', correlationId: 'test-corr-id' } };
    const result: WorkbookExtractionResult = await handler(event);

    // 1. Validate the full data object
    const fullData = result.fullWorkbookData;
    expect(fullData.sheets).toHaveLength(1);
    const sheet = fullData.sheets[0];
    expect(sheet.sheetName).toBe('BOM Data');
    expect(sheet.data[0][0].value).toBe('Project:');
    expect(sheet.data[0][1].value).toBe('Project Phoenix');
    expect(sheet.data[1].map(c => c.value)).toEqual(['Part Name', 'Material', 'Quantity']);
    expect(sheet.data[2].map(c => c.value)).toEqual(['Part-A', 'Steel', 100]);
    
    // 2. Validate the summary string
    const summary = result.workbookSummaryForLlm;
    expect(summary).toContain('--- SHEET: BOM Data ---');
    expect(summary).toContain('Row 1: Project: | Project Phoenix');
    expect(summary).toContain('Row 3: Part Name | Material | Quantity');
    expect(summary).toContain('Row 4: Part-A | Steel | 100');
  });

  it('should handle invalid dates gracefully without crashing', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('DateTest');
      sheet.addRow(['Valid Date', new Date('2024-01-15')]);
      sheet.addRow(['Number', 12345]);
      // The invalid date will be handled during extraction
      const row = sheet.addRow(['Text', 'Not a date']);
      // Force an invalid date scenario by setting a bad value type
      const cell = row.getCell(1);
      cell.value = 'Invalid';
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'dates.xlsx', correlationId: 'date-test' } 
    });

    // Should complete without throwing
    expect(result.fullWorkbookData.sheets).toHaveLength(1);
    expect(result.workbookSummaryForLlm).toContain('DateTest');
  });

  it('should handle formulas with various result types', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('Formulas');
      sheet.getCell('A1').value = 10;
      sheet.getCell('A2').value = 20;
      sheet.getCell('A3').value = { formula: 'A1+A2', result: 30 };
      sheet.getCell('B1').value = { formula: 'SUM(A1:A2)', result: 30 };
      // Division that might cause issues
      sheet.getCell('C1').value = { formula: 'A1/A2', result: 0.5 };
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'formulas.xlsx', correlationId: 'formula-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    expect(sheet.data.length).toBeGreaterThan(0);
    
    // Check that formula results are captured
    const a3Cell = sheet.data.flat().find(cell => cell.address === 'A3');
    expect(a3Cell?.value).toBe(30);
    
    const b1Cell = sheet.data.flat().find(cell => cell.address === 'B1');
    expect(b1Cell?.value).toBe(30);
    
    const c1Cell = sheet.data.flat().find(cell => cell.address === 'C1');
    expect(c1Cell?.value).toBe(0.5);
  });

  it('should handle rich text cells', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('RichText');
      sheet.getCell('A1').value = {
        richText: [
          { text: 'Bold ', font: { bold: true } },
          { text: 'Italic ', font: { italic: true } },
          { text: 'Normal' }
        ]
      };
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'richtext.xlsx', correlationId: 'richtext-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    const cell = sheet.data[0].find(c => c.address === 'A1');
    expect(cell).toBeDefined();
    expect(cell?.value).toBe('Bold Italic Normal');
  });

  it('should handle hyperlink cells', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('Links');
      sheet.getCell('A1').value = {
        text: 'Click here',
        hyperlink: 'https://example.com'
      };
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'links.xlsx', correlationId: 'link-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    const cell = sheet.data[0].find(c => c.address === 'A1');
    expect(cell).toBeDefined();
    expect(cell?.value).toBe('Click here');
    expect(cell?.type).toBe('hyperlink');
  });

  it('should handle merged cells correctly', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('Merged');
      sheet.mergeCells('A1:C1');
      sheet.getCell('A1').value = 'Merged Header';
      sheet.addRow(['Col A', 'Col B', 'Col C']);
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'merged.xlsx', correlationId: 'merged-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    // First row should only have the master cell
    const firstRowCells = sheet.data[0];
    expect(firstRowCells.length).toBe(1);
    expect(firstRowCells[0].value).toBe('Merged Header');
  });

  it('should handle empty sheets', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      wb.addWorksheet('Empty Sheet');
      const sheet2 = wb.addWorksheet('Sheet with Data');
      sheet2.addRow(['Data']);
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'empty.xlsx', correlationId: 'empty-test' } 
    });

    expect(result.fullWorkbookData.sheets).toHaveLength(2);
    expect(result.fullWorkbookData.sheets[0].data).toHaveLength(0);
    expect(result.fullWorkbookData.sheets[1].data.length).toBeGreaterThan(0);
  });

  it('should extract and upload an image, adding S3 key to the full data output', async () => {
    // Create a minimal 1x1 PNG as a Node.js Buffer
    const PngMinimal1x1_NodeBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    // Convert the Node.js Buffer to a standard ArrayBuffer
    const PngMinimal1x1_ArrayBuffer = PngMinimal1x1_NodeBuffer.buffer.slice(
        PngMinimal1x1_NodeBuffer.byteOffset,
        PngMinimal1x1_NodeBuffer.byteOffset + PngMinimal1x1_NodeBuffer.byteLength
    );

    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('BOM');
      sheet.addRow(['Part-A']);
      const imageId = wb.addImage({ buffer: PngMinimal1x1_ArrayBuffer, extension: 'png' });
      sheet.addImage(imageId, 'B2:B2');
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });
    s3Mock.on(PutObjectCommand).resolves({});

    const result: WorkbookExtractionResult = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'test.xlsx', correlationId: 'test-id-img' } 
    });

    // Assert that the S3 PutObjectCommand was called for the image
    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    const putCommandCall = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(putCommandCall.Bucket).toBe('mock-artefacts-bucket');
    expect(putCommandCall.Key).toMatch(/bom-images\/test-id-img\/.*\.png/);

    // Assert the image details are in the full workbook data
    const fullData = result.fullWorkbookData;
    expect(fullData.sheets[0].images).toHaveLength(1);
    expect(fullData.sheets[0].images[0].s3Key).toContain('s3://mock-artefacts-bucket/bom-images/test-id-img/');
    expect(result.fullWorkbookData.sheets[0].images[0].range).toBe('B2:C3');
  });

  it('should handle cells with null and undefined values', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('NullTest');
      sheet.getCell('A1').value = null;
      sheet.getCell('A2').value = undefined;
      sheet.getCell('A3').value = 'Valid';
      sheet.getCell('A4').value = 0; // Zero should be included
      sheet.getCell('A5').value = false; // Boolean false should be included
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'null.xlsx', correlationId: 'null-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    // Only cells with actual content should be included
    const allCells = sheet.data.flat();
    expect(allCells.some(c => c.value === 'Valid')).toBe(true);
    expect(allCells.some(c => c.value === 0)).toBe(true);
    expect(allCells.some(c => c.value === false)).toBe(true);
  });

  it('should handle very large values in summary truncation', async () => {
    const longString = 'A'.repeat(200);
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('LongData');
      sheet.addRow(['Short', longString]);
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'long.xlsx', correlationId: 'long-test' } 
    });

    // Summary should truncate long values
    const summary = result.workbookSummaryForLlm;
    expect(summary).toContain('...');
    expect(summary.length).toBeLessThan(longString.length * 2);
  });

  it('should handle multiple sheets with various data types', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet1 = wb.addWorksheet('Numbers');
      sheet1.addRow([1, 2.5, -10, 0]);
      
      const sheet2 = wb.addWorksheet('Strings');
      sheet2.addRow(['Hello', 'World', '', 'Test']);
      
      const sheet3 = wb.addWorksheet('Booleans');
      sheet3.addRow([true, false, true]);
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'multi.xlsx', correlationId: 'multi-test' } 
    });

    expect(result.fullWorkbookData.sheets).toHaveLength(3);
    expect(result.fullWorkbookData.sheets[0].sheetName).toBe('Numbers');
    expect(result.fullWorkbookData.sheets[1].sheetName).toBe('Strings');
    expect(result.fullWorkbookData.sheets[2].sheetName).toBe('Booleans');
  });

  it('should throw an error if ARTEFACTS_BUCKET is not set', async () => {
    delete process.env.ARTEFACTS_BUCKET;
    const event = { stepInput: { s3Bucket: 'test', s3Key: 'test.xlsx', correlationId: 'test-id' } };
    await expect(handler(event)).rejects.toThrow('ARTEFACTS_BUCKET environment variable is not set.');
  });

  it('should handle error values in cells', async () => {
    const buffer = await createMockExcelBuffer(wb => {
      const sheet = wb.addWorksheet('Errors');
      sheet.getCell('A1').value = { error: '#DIV/0!' };
      sheet.getCell('A2').value = { error: '#REF!' };
      sheet.getCell('A3').value = { error: '#N/A' };
    });

    const stream = sdkStreamMixin(Readable.from([buffer]));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const result = await handler({ 
      stepInput: { s3Bucket: 'test', s3Key: 'errors.xlsx', correlationId: 'error-test' } 
    });

    const sheet = result.fullWorkbookData.sheets[0];
    const cells = sheet.data.flat();
    expect(cells.some(c => typeof c.value === 'string' && c.value.includes('ERROR'))).toBe(true);
  });
});