import { handler } from './extract-data-from-bom.step';
import { ExcelWorkbook, BomExtractionPlan } from '@optiroq/types';

// Mock the core-sdk logger to avoid dependency issues in tests
jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
}));

describe('extract-data-from-bom handler', () => {
  // A more realistic mock workbook, where each row is an array of only the cells that have data.
  // This matches the output of the `extract-workbook-data` step.
  const mockWorkbook: ExcelWorkbook = {
    workbookName: 'test.xlsx',
    sheets: [
      {
        sheetName: 'BOM Data',
        rowCount: 7,
        columnCount: 4,
        data: [
          // Row 1
          [{ address: 'A1', value: 'Project Name:', type: 'string' }, { address: 'B1', value: 'Project Apollo', type: 'string' }],
          // Row 2
          [{ address: 'A2', value: 'Customer:', type: 'string' }, { address: 'B2', value: 'NASA', type: 'string' }],
          // Row 3 (empty row)
          [],
          // Row 4 (Header)
          [{ address: 'A4', value: 'Part Name', type: 'string' }, { address: 'B4', value: 'Material', type: 'string' }, { address: 'C4', value: 'Quantity', type: 'string' }],
          // Row 5 (Data)
          [{ address: 'A5', value: 'Heat Shield', type: 'string' }, { address: 'B5', value: 'Titanium', type: 'string' }, { address: 'C5', value: 1, type: 'number' }],
          // Row 6 (Data)
          [{ address: 'A6', value: 'Bolt', type: 'string' }, { address: 'B6', value: 'Steel', type: 'string' }, { address: 'C6', value: 1000, type: 'number' }],
          // Row 7 (Incomplete Data)
          [{ address: 'A7', value: 'Rocket Fuel', type: 'string' }],
        ],
        images: [{ s3Key: 's3://bucket/image1.png', range: 'D5:E5' }],
      },
    ],
  };

  const mockPlan: BomExtractionPlan = {
    analysis: {
      primarySheetName: 'BOM Data',
      confidence: 0.99,
      reasoning: 'Test plan',
      projectMetadata: [
        { key: 'projectName', label: 'Project Name:', value: 'Project Apollo', valueCellAddress: 'B1' },
        { key: 'customerName', label: 'Customer:', value: 'NASA', valueCellAddress: 'B2' },
      ],
      dataTable: {
        sheetName: 'BOM Data',
        headerRow: 4,
        dataStartRow: 5,
        dataEndRow: 7, // Process until the last row with data
      },
    },
  };

  it('should correctly extract project data and parts based on the plan', async () => {
    const event = {
      stepInput: {
        workbookData: mockWorkbook,
        extractionPlan: mockPlan,
        correlationId: 'test-1',
      },
    };

    const result = await handler(event);

    // 1. Assert Project Metadata
    expect(result.project).toEqual({
      projectName: 'Project Apollo',
      customerName: 'NASA',
    });

    // 2. Assert Headers
    expect(result.headers).toEqual(['Part Name', 'Material', 'Quantity']);
    
    // 3. Assert Parts Data
    expect(result.parts).toHaveLength(3);

    // Assert first part, including image association
    expect(result.parts[0]).toEqual({
      'Part Name': 'Heat Shield',
      'Material': 'Titanium',
      'Quantity': 1,
      '_imageS3Key': 's3://bucket/image1.png',
    });

    // Assert second part
    expect(result.parts[1]).toEqual({
      'Part Name': 'Bolt',
      'Material': 'Steel',
      'Quantity': 1000,
    });
    
    // Assert third (incomplete) part, ensuring missing cells result in null values
    expect(result.parts[2]).toEqual({
      'Part Name': 'Rocket Fuel',
      'Material': null,
      'Quantity': null,
    });
  });

  it('should throw an error if the primary sheet is not found', async () => {
    const invalidPlan = JSON.parse(JSON.stringify(mockPlan));
    invalidPlan.analysis.primarySheetName = 'NonExistentSheet';

    const event = { stepInput: { workbookData: mockWorkbook, extractionPlan: invalidPlan, correlationId: 'test-2' } };

    await expect(handler(event)).rejects.toThrow('Primary sheet "NonExistentSheet" not found in workbook.');
  });

  it('should handle an empty parts table gracefully', async () => {
    const planWithNoData = JSON.parse(JSON.stringify(mockPlan));
    planWithNoData.analysis.dataTable.dataStartRow = 8; // Start row is past the end of data

    const event = { stepInput: { workbookData: mockWorkbook, extractionPlan: planWithNoData, correlationId: 'test-3' } };
    const result = await handler(event);

    expect(result.project).toEqual({ projectName: 'Project Apollo', customerName: 'NASA' });
    expect(result.parts).toHaveLength(0);
  });
});