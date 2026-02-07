// allma-core/examples/optiroq/src/optiroq-lambdas/api/commands/save-project.command.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand, DynamoDBDocumentClient, TransactWriteCommandInput, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, BOMPart, ConvertibleValue, SystemSettings, FxRates, MasterField } from '@optiroq/types';
import { randomUUID } from 'crypto';
import { createCurrencyValue, createPhysicalUnitValue } from '@optiroq/convert';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE, FX_RATES_TABLE } = process.env;
const DYNAMODB_TRANSACT_ITEMS_LIMIT = 100; // DynamoDB limit for TransactWriteItems

// --- Cached data to reduce DB calls per invocation ---
let systemSettings: SystemSettings | null = null;
let latestFxRates: FxRates | null = null;
let masterFields: MasterField[] | null = null;

interface SaveProjectPayload {
  project: Partial<Project>;
  bomParts: BOMPart[];
  isDraft: boolean;
}

async function getSystemSettings(): Promise<SystemSettings> {
  if (systemSettings) return systemSettings;
  const { Item } = await docClient.send(new GetCommand({ TableName: ENTITY_GRAPH_TABLE, Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' } }));
  if (!Item) throw new Error('System settings not found.');
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

async function getMasterFields(): Promise<MasterField[]> {
    if (masterFields) return masterFields;
    const { Items } = await docClient.send(new QueryCommand({
        TableName: ENTITY_GRAPH_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONFIG#MASTER_FIELD_LIST' }
    }));
    if (!Items) throw new Error('Master fields not found.');
    masterFields = Items as MasterField[];
    return masterFields;
}

async function normalizeValue(
    value: any,
    field: MasterField,
    project: Partial<Project>,
    settings: SystemSettings,
    rates: FxRates
): Promise<ConvertibleValue | number | any> {
    const isConvertibleType = ['currency', 'weight', 'length', 'volume'].includes(field.fieldType);
    if (!isConvertibleType) return value;

    let numericValue: number | null = null;
    let unit: string | null = null;

    if (typeof value === 'object' && value !== null && 'value' in value) {
        numericValue = value.value;
        unit = value.unit || null; // Handle case where unit is undefined
    } else if (typeof value === 'number') {
        numericValue = value;
        // unit remains null, will be populated by default logic below
    }

    // If unit is still not set, determine the default from the project or system settings.
    if (unit === null) {
         switch(field.fieldType) {
            case 'currency': unit = project.defaultCurrency ?? settings.baseCurrency; break;
            case 'weight': unit = project.defaultWeightUnit ?? settings.baseWeight; break;
            case 'length': unit = project.defaultLengthUnit ?? settings.baseLength; break;
            case 'volume': unit = project.defaultVolumeUnit ?? settings.baseVolume; break;
        }
    }

    // If we don't have a number, return a shell object with just the unit.
    if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
        return { value: null, unit: unit };
    }

    try {
        switch(field.fieldType) {
            case 'currency':
                return createCurrencyValue(numericValue, unit!, settings.baseCurrency, rates, field.precision);
            case 'weight':
                return createPhysicalUnitValue(numericValue, unit!, settings.baseWeight, field.precision);
            case 'length':
                return createPhysicalUnitValue(numericValue, unit!, settings.baseLength, field.precision);
            case 'volume':
                return createPhysicalUnitValue(numericValue, unit!, settings.baseVolume, field.precision);
            default:
                return value; // Should not be reached
        }
    } catch (error) {
        log_error('Failed to normalize value', { error, value, field: field.key });
        // Return a convertible-like object with an error to prevent data loss and aid debugging.
        return { value: numericValue, unit: unit, error: (error as Error).message };
    }
}


export async function saveProject(
  projectId: string | null,
  payload: SaveProjectPayload,
  userId: string
): Promise<{ projectId: string }> {
  if (!ENTITY_GRAPH_TABLE || !FX_RATES_TABLE) {
    throw new Error('Server configuration error: Missing environment variables.');
  }

  const { project, bomParts, isDraft } = payload;
  const finalProjectId = projectId || project.projectId || randomUUID();
  log_info('Saving project', { projectId: finalProjectId, userId, isDraft, partsCount: bomParts.length });
  
  const [settings, allMasterFields] = await Promise.all([getSystemSettings(), getMasterFields()]);
  const rates = await getLatestFxRates(settings.baseCurrency);
  const masterFieldMap = new Map(allMasterFields.map(f => [f.key, f]));

  const now = new Date().toISOString();
  
  const newStatus: Project['status'] = isDraft 
      ? (project.status && ['DRAFT', 'DRAFT_AWAITING_REVIEW'].includes(project.status) ? project.status : 'DRAFT')
      : 'ACTIVE';

  const projectItem: Omit<Project, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK' > = {
    ...project,
    projectId: finalProjectId,
    ownerId: userId,
    lastModified: now,
    createdAt: project.createdAt || now,
    status: newStatus,
    entityType: 'PROJECT',
    methodUsed: project.methodUsed || 'scratch',
    // Apply system defaults if project-level defaults are not set
    defaultCurrency: project.defaultCurrency || settings.baseCurrency,
    defaultWeightUnit: project.defaultWeightUnit || settings.baseWeight,
  };
  
  // Normalize project-level fields before saving
  for(const key in projectItem) {
      const fieldDef = masterFieldMap.get(key);
      if (fieldDef) {
          (projectItem as any)[key] = await normalizeValue((projectItem as any)[key], fieldDef, projectItem, settings, rates);
      }
  }

  const transactionItems: TransactWriteCommandInput['TransactItems'] = [{
    Put: {
      TableName: ENTITY_GRAPH_TABLE,
      Item: { 
        ...projectItem, 
        PK: `PROJECT#${finalProjectId}`, 
        SK: 'METADATA', 
        GSI1PK: 'PROJECTS', 
        GSI1SK: now 
      },
    },
  }];

  for (const part of bomParts) {
    if (!part.partName) {
      log_error('Skipping part with no name', { projectId: finalProjectId, part });
      continue;
    }
    const processedPart = { ...part };
    for (const key in processedPart) {
      const fieldDef = masterFieldMap.get(key);
      if (fieldDef) {
          (processedPart as any)[key] = await normalizeValue((processedPart as any)[key], fieldDef, projectItem, settings, rates);
      }
    }

    transactionItems.push({
      Put: {
        TableName: ENTITY_GRAPH_TABLE,
        Item: { ...processedPart, PK: `PROJECT#${finalProjectId}`, SK: `BOM_PART#${part.partName}`, entityType: 'BOM_PART' },
      },
    });
  }

  if (transactionItems.length > DYNAMODB_TRANSACT_ITEMS_LIMIT) {
    throw new Error(`Payload too large: Cannot save more than ${DYNAMODB_TRANSACT_ITEMS_LIMIT -1} parts in a single transaction.`);
  }

  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactionItems }));
    log_info('Successfully saved project and parts', { projectId: finalProjectId });
    return { projectId: finalProjectId };
  } catch (error) {
    log_error('Failed to save project transaction to DynamoDB', { projectId: finalProjectId, error });
    throw new Error('An error occurred while saving the project.');
  }
}