import {
  BOMPart, MappingPlan, MasterField, Project, ProjectData, StructuredBOM, ValidationResult, FxRates, SystemSettings, ConvertibleValue
} from '@optiroq/types';
import { log_info, log_warn, log_error } from '@allma/core-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createCurrencyValue, createPhysicalUnitValue } from '@optiroq/convert';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE, FX_RATES_TABLE } = process.env;

// --- Data Fetching Utilities (with in-memory caching per invocation) ---
let systemSettings: SystemSettings | null = null;
let latestFxRates: FxRates | null = null;

async function getSystemSettings(): Promise<SystemSettings> {
  if (systemSettings) return systemSettings;
  if (!ENTITY_GRAPH_TABLE) throw new Error('ENTITY_GRAPH_TABLE not set.');
  const { Item } = await docClient.send(new GetCommand({ TableName: ENTITY_GRAPH_TABLE, Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' } }));
  if (!Item) throw new Error('System settings for base units not found.');
  systemSettings = Item as SystemSettings;
  return systemSettings;
}

async function getLatestFxRates(baseCurrency: string): Promise<FxRates> {
  if (latestFxRates && latestFxRates.base === baseCurrency) return latestFxRates;
  if (!FX_RATES_TABLE) throw new Error('FX_RATES_TABLE is not set');
  const { Item } = await docClient.send(new GetCommand({ TableName: FX_RATES_TABLE, Key: { PK: 'RATE#LATEST', SK: baseCurrency } }));
  if (!Item) throw new Error(`Latest FX rates not found for base currency ${baseCurrency}.`);
  latestFxRates = Item as FxRates;
  return latestFxRates;
}

async function getProjectDefaults(projectId: string): Promise<Partial<Project>> {
    if (!ENTITY_GRAPH_TABLE) throw new Error('ENTITY_GRAPH_TABLE not set.');
    const { Item } = await docClient.send(new GetCommand({ TableName: ENTITY_GRAPH_TABLE, Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' } }));
    return (Item as Project) || {};
}

/**
 * Parses a string to extract a numeric value and an optional unit.
 * Examples: "1.5kg" -> { value: 1.5, unit: 'kg' }, "1,000.50" -> { value: 1000.5, unit: null }
 */
function parseValueWithUnit(rawValue: any): { value: number; unit: string | null } | null {
    if (typeof rawValue === 'number') {
        return { value: rawValue, unit: null };
    }
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        return null;
    }
    const valueStr = rawValue.trim();
    // Regex to capture a number (including commas/dots) and an optional trailing unit.
    const match = valueStr.match(/^(-?[\d,.]+)\s*([a-zA-Zμ°%µ/]+)?$/);

    if (!match) return null;

    const numericPart = match[1].replace(/,/g, ''); // Remove commas for parsing
    const unitPart = match[2] || null;
    const value = parseFloat(numericPart);

    if (isNaN(value)) return null;

    return { value, unit: unitPart };
}


interface StepInput {
  extractedData: {
    project: ProjectData;
    parts: Record<string, any>[];
  };
  mappingPlan: MappingPlan;
  masterFields: { content: MasterField[]; };
  correlationId: string;
  projectId?: string;
}

export const handler = async (event: { stepInput: StepInput }): Promise<ValidationResult> => {
  const { extractedData, mappingPlan, masterFields, correlationId, projectId } = event.stepInput;
  log_info('Mapping, normalizing, and validating structured BOM data', { correlationId, partCount: extractedData.parts.length });

  const errors: string[] = [];
  const mappedParts: BOMPart[] = [];
  const masterFieldMap = new Map(masterFields.content.map(f => [f.key, f]));
  const partFields = masterFields.content.filter(f => f.group === 'BOM');

  const [projectDefaults, settings] = await Promise.all([
    projectId ? getProjectDefaults(projectId) : Promise.resolve<Partial<Project>>({}),
    getSystemSettings(),
  ]);
  const rates = await getLatestFxRates(settings.baseCurrency);

  for (const rawPart of extractedData.parts) {
    const intermediatePart: Partial<BOMPart> = { customAttributes: {}, _mappingConfidence: {} };

    for (const rawHeader in rawPart) {
      const plan = mappingPlan[rawHeader];
      let value = rawPart[rawHeader];
      
      if (plan && plan.mapsTo) {
        const masterField = masterFieldMap.get(plan.mapsTo);
        if (masterField) {
            const isConvertible = ['currency', 'weight', 'length', 'volume'].includes(masterField.fieldType);
            if (isConvertible) {
                const parsed = parseValueWithUnit(value);
                if (parsed) {
                    let unit = parsed.unit;
                    if (!unit) { // Fallback chain for unit
                        switch(masterField.fieldType) {
                            case 'currency': 
                                unit = extractedData.project.defaultCurrency 
                                    ?? projectDefaults.defaultCurrency 
                                    ?? settings.baseCurrency; 
                                break;
                            case 'weight': 
                                unit = extractedData.project.defaultWeightUnit 
                                    ?? projectDefaults.defaultWeightUnit 
                                    ?? settings.baseWeight; 
                                break;
                            case 'length': unit = (extractedData.project as any).defaultLengthUnit ?? projectDefaults.defaultLengthUnit ?? settings.baseLength; break;
                            case 'volume': unit = (extractedData.project as any).defaultVolumeUnit ?? projectDefaults.defaultVolumeUnit ?? settings.baseVolume; break;
                        }
                    }
                    if (unit) {
                        try {
                            switch(masterField.fieldType) {
                                case 'currency': value = createCurrencyValue(parsed.value, unit, settings.baseCurrency, rates, masterField.precision); break;
                                case 'weight': value = createPhysicalUnitValue(parsed.value, unit, settings.baseWeight, masterField.precision); break;
                                case 'length': value = createPhysicalUnitValue(parsed.value, unit, settings.baseLength, masterField.precision); break;
                                case 'volume': value = createPhysicalUnitValue(parsed.value, unit, settings.baseVolume, masterField.precision); break;
                            }
                        } catch (e) {
                            log_warn(`Could not normalize field '${masterField.key}'`, { value: parsed.value, unit, error: (e as Error).message, correlationId });
                            value = parsed.value; // Fallback to numeric value
                        }
                    } else { value = parsed.value; } // No unit available, store as number
                }
            } else if (value !== null && value !== undefined) { // Simple type conversion
                switch (masterField.fieldType) {
                    case 'number': value = Number(value); if (isNaN(value)) value = rawPart[rawHeader]; break;
                    case 'boolean': const lowerValue = String(value).toLowerCase(); value = ['true', 'yes', '1'].includes(lowerValue); break;
                }
            }
        }
        (intermediatePart as any)[plan.mapsTo] = value;
        if (intermediatePart._mappingConfidence) intermediatePart._mappingConfidence[plan.mapsTo] = plan.confidence;
      } else {
        if (intermediatePart.customAttributes) intermediatePart.customAttributes[rawHeader] = value;
      }
    }
    
    // Ensure all mandatory convertible fields have a default unit structure, even if missing from the source file.
    const mandatoryPartFields = partFields.filter(f => Array.isArray(f.validationRules) && f.validationRules.some(r => r.type === 'required'));
    for (const field of mandatoryPartFields) {
        if ((intermediatePart as any)[field.key] === undefined) {
            const isConvertible = ['currency', 'weight', 'length', 'volume'].includes(field.fieldType);
            if (isConvertible) {
                let defaultUnit: string | null = null;
                 switch(field.fieldType) {
                    case 'currency': defaultUnit = extractedData.project.defaultCurrency ?? projectDefaults.defaultCurrency ?? settings.baseCurrency; break;
                    case 'weight': defaultUnit = extractedData.project.defaultWeightUnit ?? projectDefaults.defaultWeightUnit ?? settings.baseWeight; break;
                    case 'length': defaultUnit = (extractedData.project as any).defaultLengthUnit ?? projectDefaults.defaultLengthUnit ?? settings.baseLength; break;
                    case 'volume': defaultUnit = (extractedData.project as any).defaultVolumeUnit ?? projectDefaults.defaultVolumeUnit ?? settings.baseVolume; break;
                }
                (intermediatePart as any)[field.key] = { value: null, unit: defaultUnit };
            }
        }
    }

    const { customAttributes, ...restOfPart } = intermediatePart;
    const finalPart: BOMPart = restOfPart as BOMPart;
    if (customAttributes && Object.keys(customAttributes).length > 0) finalPart.customAttributes = customAttributes;
    mappedParts.push(finalPart);
  }

  const partNames = new Set<string>();
  for (const [index, part] of mappedParts.entries()) {
    const partIdentifier = part.partName || `Row ${index + 1}`;
    if (part.partName) {
      if (partNames.has(part.partName)) errors.push(`Part "${partIdentifier}": Duplicate part name found. Must be unique.`);
      partNames.add(part.partName);
    }

    for (const field of partFields) {
      if (!field.validationRules || !Array.isArray(field.validationRules)) continue;

      const value = part[field.key as keyof BOMPart];
      const isConvertible = typeof value === 'object' && value !== null && 'value' in value;
      const checkValue = isConvertible ? (value as ConvertibleValue).value : value;
      
      const requiredRule = field.validationRules.find(r => r.type === 'required');
      if (requiredRule && (checkValue === undefined || checkValue === null || String(checkValue).trim() === '')) {
        errors.push(`Part "${partIdentifier}": Missing required field '${field.displayName}'.`);
      }

      if (checkValue !== undefined && checkValue !== null && String(checkValue).trim() !== '') {
        const numValue = Number(checkValue);
        if (['number', 'currency', 'weight', 'length', 'volume'].includes(field.fieldType) && isNaN(numValue)) {
            errors.push(`Part "${partIdentifier}": Field '${field.displayName}' must be a number, but received "${checkValue}".`);
        }
        
        const integerRule = field.validationRules.find(r => r.type === 'integer');
        if (integerRule && !Number.isInteger(numValue)) {
          errors.push(`Part "${partIdentifier}": Field '${field.displayName}' must be a whole number.`);
        }
        
        const minRule = field.validationRules.find(r => r.type === 'min');
        if (minRule && minRule.value !== undefined && numValue < minRule.value) {
          errors.push(`Part "${partIdentifier}": Field '${field.displayName}' must be at least ${minRule.value}.`);
        }
      }
    }
  }

  const structuredBom: StructuredBOM = { project: extractedData.project, parts: mappedParts };
  const isValid = errors.length === 0;

  if (isValid) log_info('BOM mapping and validation successful', { correlationId });
  else log_warn('BOM mapping and validation failed', { correlationId, errorCount: errors.length, errors });

  return { isValid, errors, validatedData: structuredBom, partsCount: mappedParts.length };
};