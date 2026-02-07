import { handler } from './map-and-validate-bom-data.step';
import { MasterField, MappingPlan, FxRates, SystemSettings } from '@optiroq/types';
import * as fs from 'fs';
import * as path from 'path';

import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_warn: jest.fn(),
}));

// FIX: Create a mock for the DynamoDB Document Client.
const ddbMock = mockClient(DynamoDBDocumentClient);

const masterFieldsPath = path.join(__dirname, '../../../../config/master-fields.json');
const masterFields: MasterField[] = JSON.parse(fs.readFileSync(masterFieldsPath, 'utf-8'));

describe('map-and-validate-bom-data handler', () => {
  // FIX: Define mock data that the handler will try to fetch from DynamoDB.
  const mockSystemSettings: SystemSettings = {
    PK: 'CONFIG#SYSTEM_SETTINGS',
    SK: 'BASE_UNITS',
    entityType: 'CONFIGURATION',
    baseCurrency: 'EUR',
    baseWeight: 'kg',
    baseLength: 'm',
    baseVolume: 'l',
  };

  const mockFxRates: FxRates = {
    base: 'EUR',
    timestamp: new Date().toISOString(),
    rates: { EUR: 1, USD: 1.1, GBP: 0.85 },
  };

  beforeEach(() => {
    // FIX: Reset the mock before each test and set up mock responses for the new DB calls.
    ddbMock.reset();
    process.env.ENTITY_GRAPH_TABLE = 'TestTable';
    process.env.FX_RATES_TABLE = 'TestFxTable';
    
    ddbMock.on(GetCommand, { TableName: 'TestTable', Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' } }).resolves({ Item: mockSystemSettings });
    ddbMock.on(GetCommand, { TableName: 'TestFxTable', Key: { PK: 'RATE#LATEST', SK: 'EUR' } }).resolves({ Item: mockFxRates });
    // Mock the project get command to return an empty object, simulating a new project with no defaults.
    ddbMock.on(GetCommand, { TableName: 'TestTable', Key: { PK: 'PROJECT#test-project-id', SK: 'METADATA' } }).resolves({ Item: {} });
  });

  afterEach(() => {
    delete process.env.ENTITY_GRAPH_TABLE;
    delete process.env.FX_RATES_TABLE;
  });

  const mockMappingPlan: MappingPlan = {
    'Part Name': { mapsTo: 'partName', confidence: 0.99 },
    Material: { mapsTo: 'material', confidence: 0.98 },
    'Annual Qty': { mapsTo: 'quantity', confidence: 0.95 },
    'Internal Code': { mapsTo: null, confidence: 0.4 },
    'Is EU Pallet': { mapsTo: 'usesEuroPallet', confidence: 0.9 },
    // Add all required fields to the mapping plan
    'Part Target Price': { mapsTo: 'partTargetPrice', confidence: 1 },
    'Material Cost': { mapsTo: 'materialCost', confidence: 1 },
    'Process Cost': { mapsTo: 'processCost', confidence: 1 },
    'Tooling Investment': { mapsTo: 'toolingInvestment', confidence: 1 },
    'Amortization in Price': { mapsTo: 'amortizationIncluded', confidence: 1 },
    'Lead Time: Sample A': { mapsTo: 'leadTimeSampleA', confidence: 1 },
    'Lead Time: PPAP': { mapsTo: 'leadTimePPAP', confidence: 1 },
    'Lead Time: SOP': { mapsTo: 'leadTimeSOP', confidence: 1 },
    Incoterms: { mapsTo: 'incoterms', confidence: 1 },
    'Delivery Location': { mapsTo: 'deliveryLocation', confidence: 1 },
  };

  const baseValidRawPart = {
    'Part Name': 'Base-Part',
    Material: 'Steel',
    'Annual Qty': '100',
    'Part Target Price': '10.50 USD',
    'Material Cost': '5.25 USD',
    'Process Cost': '3.15 USD',
    'Tooling Investment': '50000 USD',
    'Amortization in Price': 'false',
    'Lead Time: Sample A': '4 weeks',
    'Lead Time: PPAP': '8 weeks',
    'Lead Time: SOP': '12 weeks',
    Incoterms: 'FOB',
    'Delivery Location': 'Houston, TX'
  };

  it('should correctly map, convert, and validate data, returning isValid: false with errors', async () => {
    const mockExtractedData = {
      project: { projectName: 'Test Project' },
      parts: [
        { ...baseValidRawPart, 'Part Name': 'Part-A', 'Internal Code': 'XYZ', 'Is EU Pallet': 'yes' },
        { ...baseValidRawPart, 'Part Name': 'Part-B', 'Annual Qty': '250.5' }, // Invalid quantity (not integer)
        { ...baseValidRawPart, 'Part Name': 'Part-C', Material: '' }, // Missing material
        { ...baseValidRawPart, 'Part Name': 'Part-A' }, // Duplicate name
        { ...baseValidRawPart, 'Part Name': 'Part-D', 'Annual Qty': '-10' }, // Invalid quantity (negative)
      ],
    };

    const event = {
      stepInput: {
        extractedData: mockExtractedData,
        mappingPlan: mockMappingPlan,
        masterFields: { content: masterFields },
        correlationId: 'test-id-1',
        projectId: 'test-project-id'
      },
    };

    const result = await handler(event);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(4);
    // FIX: Updated the validation error message keys to match the ones in master-fields.json
    expect(result.errors).toContain("Part \"Part-B\": Field 'Annual Quantity' must be a whole number.");
    expect(result.errors).toContain("Part \"Part-C\": Missing required field 'Material'.");
    expect(result.errors).toContain('Part "Part-A": Duplicate part name found. Must be unique.');
    expect(result.errors).toContain("Part \"Part-D\": Field 'Annual Quantity' must be at least 1.");

    // Check mapping and conversion on the first part
    const firstPart = result.validatedData.parts[0];
    expect(firstPart.partName).toBe('Part-A');
    expect(firstPart.quantity).toBe(100); // Converted to number
    expect(firstPart.usesEuroPallet).toBe(true); // Converted to boolean
    expect(firstPart.customAttributes).toEqual({ 'Internal Code': 'XYZ' });
    expect(firstPart._mappingConfidence?.quantity).toBe(0.95);

    // Check currency conversion
    const materialCost = firstPart.materialCost as any;
    expect(materialCost.originalValue).toBe(5.25);
    expect(materialCost.originalUnit).toBe('USD');
    expect(materialCost.normalizedUnit).toBe('EUR');
    // 5.25 USD / 1.1 USD per EUR = 4.7727... EUR, rounded to 4dp
    expect(materialCost.normalizedValue).toBe(4.7727);
  });

  it('should return isValid: true for a perfectly valid BOM', async () => {
    const validData = {
      project: { projectName: 'Valid Project' },
      parts: [{ ...baseValidRawPart, 'Part Name': 'Valid-1' }],
    };

    const event = {
      stepInput: {
        extractedData: validData,
        mappingPlan: mockMappingPlan,
        masterFields: { content: masterFields },
        correlationId: 'test-id-2',
        projectId: 'test-project-id'
      },
    };

    const result = await handler(event);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validatedData.parts[0].partName).toBe('Valid-1');
    expect(result.validatedData.parts[0].quantity).toBe(100);
    expect(result.validatedData.parts[0].amortizationIncluded).toBe(false);
  });
});