import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { FxRates, MasterField, SystemSettings, ConvertibleValue } from '@optiroq/types';
import { createCurrencyValue, createPhysicalUnitValue } from '@optiroq/convert';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { ENTITY_GRAPH_TABLE, FX_RATES_TABLE } = process.env;

// Cached settings to reduce DynamoDB calls within a single invocation
let systemSettings: SystemSettings | null = null;
let latestFxRates: FxRates | null = null;

async function getSystemSettings(): Promise<SystemSettings> {
  if (systemSettings) return systemSettings;
  if (!ENTITY_GRAPH_TABLE) throw new Error('ENTITY_GRAPH_TABLE not set.');
  
  const { Item } = await docClient.send(new GetCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' },
  }));

  if (!Item) throw new Error('System settings for base units not found.');
  systemSettings = Item as SystemSettings;
  return systemSettings;
}

async function getLatestFxRates(): Promise<FxRates> {
  if (latestFxRates) return latestFxRates;
  if (!FX_RATES_TABLE) throw new Error('FX_RATES_TABLE not set.');
  
  const { Item } = await docClient.send(new GetCommand({
    TableName: FX_RATES_TABLE,
    Key: { PK: 'RATE#LATEST', SK: 'EUR' }, // Assuming EUR is the base
  }));

  if (!Item) throw new Error('Latest FX rates not found in the database.');
  latestFxRates = Item as FxRates;
  return latestFxRates;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Performs deterministic normalization on semantically enriched quote data.
 * This includes currency conversion, unit standardization, and critical calculations.
 * @param event The input event from Allma, containing enriched quote data.
 * @returns A fully normalized quote data object with ConvertibleValue fields.
 */
export const handler = async (event: any): Promise<any> => {
    const correlationId = event.correlationId;
    log_info('Normalizing quote data...', { correlationId, input: event.stepInput });
  
    const enrichedData = event.stepInput.enrichedData;
    const masterFieldList: MasterField[] = event.stepInput.masterFieldList;
  
    if (!masterFieldList) {
      throw new Error('Master field list not found in step input.');
    }
    const masterFieldMap = new Map(masterFieldList.map(f => [f.key, f]));
  
    const settings = await getSystemSettings();
    const normalizedOutput: Record<string, any> = {};
  
    const normalizeScope = async (scopeData: Record<string, any>): Promise<Record<string, any>> => {
      const normalizedScope: Record<string, any> = {};
      for (const key in scopeData) {
        const fieldDefinition = masterFieldMap.get(key);
        const rawField = scopeData[key];
  
        if (!fieldDefinition || typeof rawField !== 'object' || rawField === null || !('value' in rawField)) {
          normalizedScope[key] = rawField;
          continue;
        }
  
        if (typeof rawField.value === 'boolean') {
          normalizedScope[key] = rawField.value;
          continue;
        }
        
        if (!('unit' in rawField) || rawField.unit === null) {
            normalizedScope[key] = rawField;
            continue;
        }
  
        try {
          let convertedValue: ConvertibleValue | null = null;
          const originalValue = Number(rawField.value);
          const originalUnit = String(rawField.unit);
          const precision = fieldDefinition.precision ?? 2;
  
          if (isNaN(originalValue)) {
            log_info(`Skipping conversion for non-numeric value`, { correlationId, key, value: rawField.value });
            normalizedScope[key] = rawField;
            continue;
          }
  
          switch (fieldDefinition.fieldType) {
            case 'currency':
              const rates = await getLatestFxRates();
              convertedValue = createCurrencyValue(originalValue, originalUnit, settings.baseCurrency, rates, precision);
              break;
            case 'weight':
              convertedValue = createPhysicalUnitValue(originalValue, originalUnit, settings.baseWeight, precision);
              break;
            case 'length':
              convertedValue = createPhysicalUnitValue(originalValue, originalUnit, settings.baseLength, precision);
              break;
            default:
              break;
          }
          
          if (convertedValue) {
            normalizedScope[key] = convertedValue;
          } else {
            normalizedScope[key] = rawField;
          }
        } catch (error) {
          log_error(`Failed to normalize field '${key}'`, { correlationId, field: rawField, error });
          normalizedScope[key] = { ...rawField, error: (error as Error).message };
        }
      }
      return normalizedScope;
    };
  
    for (const scopeKey in enrichedData) {
      normalizedOutput[scopeKey] = await normalizeScope(enrichedData[scopeKey]);
    }
  
    const globalData = normalizedOutput._global || {};
    if (globalData.amortizationIncluded === true && globalData.amortizationAmount) {
        for (const partKey in normalizedOutput) {
            if (partKey === '_global') continue;
            
            const partData = normalizedOutput[partKey];
            if(partData.partTargetPrice) {
                const amortization = (globalData.amortizationAmount as ConvertibleValue)?.normalizedValue || 0;
                const piecePrice = (partData.partTargetPrice as ConvertibleValue)?.normalizedValue || 0;
                partData.adjustedPiecePrice = piecePrice - amortization;
            }
        }
    }
  
    let totalLogisticsCost = 0;
    const cartonQty = (globalData.cartonQuantity as any)?.value;
    if (cartonQty && globalData.costPerCarton) {
        totalLogisticsCost += cartonQty * ((globalData.costPerCarton as ConvertibleValue)?.normalizedValue || 0);
    }
    if (globalData.returnablePackagingCost) {
        totalLogisticsCost += (globalData.returnablePackagingCost as ConvertibleValue)?.normalizedValue || 0;
    }
    if (globalData.cleaningCost) {
        totalLogisticsCost += (globalData.cleaningCost as ConvertibleValue)?.normalizedValue || 0;
    }

    if (normalizedOutput._global) {
      normalizedOutput._global.totalLogisticsCost = totalLogisticsCost;
    }
    
    return normalizedOutput;
};