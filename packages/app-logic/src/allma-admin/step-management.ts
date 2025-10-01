import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { 
    AdminPermission, 
    CreateStepDefinitionInputSchema, 
    UpdateStepDefinitionInputSchema,
    SYSTEM_STEP_DEFINITIONS,
    ExternalStepRegistryItem,
    ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
    StepDefinition,
    ENV_VAR_NAMES,
} from '@allma/core-types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { StepDefinitionService } from './services/step-definition.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const ALLMA_CONFIG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME];

// A unified type for the UI to consume
type UnifiedStepDefinition = StepDefinition & { 
    source: 'user' | 'external' | 'system';
    defaultConfig?: any;
};

/**
 * Aggregates step definitions from three sources:
 * 1. User-defined steps from the main table.
 * 2. External steps from the registry in the config table.
 * 3. Static system step definitions.
 */
const listAggregatedStepDefinitions = async (event?: APIGatewayProxyEventV2): Promise<UnifiedStepDefinition[]> => {
    if (!ALLMA_CONFIG_TABLE_NAME) {
        throw new Error(`Missing required environment variable: ${ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME}`);
    }

    const requestedSources = event?.queryStringParameters?.source?.split(',') || ['user', 'external', 'system'];
    const allSteps: UnifiedStepDefinition[] = [];

    // 1. Fetch user-defined steps if requested
    if (requestedSources.includes('user')) {
        const userDefinedSteps = await StepDefinitionService.list();
        const userSteps: UnifiedStepDefinition[] = userDefinedSteps.map(s => ({ ...s, source: 'user' }));
        allSteps.push(...userSteps);
    }

    // 2. Fetch external steps from the registry if requested
    if (requestedSources.includes('external')) {
        const query = new QueryCommand({
            TableName: ALLMA_CONFIG_TABLE_NAME,
            IndexName: 'GSI_ItemType_Id',
            KeyConditionExpression: 'itemType = :itemType',
            ExpressionAttributeValues: {
                ':itemType': ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
            },
        });
        const externalStepItems = (await ddbDocClient.send(query)).Items as ExternalStepRegistryItem[] | undefined;
        
        const externalSteps = (externalStepItems || []).map(item => ({
            id: item.moduleIdentifier,
            name: item.displayName,
            description: item.description,
            stepType: item.stepType,
            moduleIdentifier: item.moduleIdentifier,
            source: 'external',
            defaultConfig: item.defaultConfig,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })) as unknown as UnifiedStepDefinition[];
        allSteps.push(...externalSteps);
    }

    // 3. Format system steps if requested
    if (requestedSources.includes('system')) {
        const systemSteps = SYSTEM_STEP_DEFINITIONS.map(s => ({
            ...s,
            source: 'system',
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })) as unknown as UnifiedStepDefinition[];
        allSteps.push(...systemSteps);
    }

    return allSteps;
};


/**
 * Main handler for all Step Definition management API requests.
 * This handler is created by a generic factory for non-versioned entities.
 */
export const handler = createCrudHandler({
    isVersioned: false,
    service: {
        // Override the list method with our aggregated function
        list: listAggregatedStepDefinitions,
        get: StepDefinitionService.get,
        create: StepDefinitionService.create,
        update: StepDefinitionService.update,
        delete: StepDefinitionService.delete,
    },
    schemas: {
        create: CreateStepDefinitionInputSchema,
        update: UpdateStepDefinitionInputSchema,
    },
    permissions: {
        read: AdminPermission.DEFINITIONS_READ,
        write: AdminPermission.DEFINITIONS_WRITE,
        delete: AdminPermission.DEFINITIONS_DELETE,
    },
    basePath: '/allma/step-definitions',
    idParamName: 'stepDefinitionId',
});
