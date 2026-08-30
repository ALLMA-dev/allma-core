import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { 
    AdminPermission, 
    CreateStepDefinitionInputSchema, 
    UpdateStepDefinitionInputSchema,
    SYSTEM_STEP_DEFINITIONS,
    StepDefinition,
} from '@allma/core-types';
import { StepDefinitionService } from './services/step-definition.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';

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
        const externalStepItems = await StepDefinitionService.listExternalSteps();
        
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
        list: listAggregatedStepDefinitions,
        get: (id) => StepDefinitionService.get(id),
        create: (data) => StepDefinitionService.create(data),
        update: (id, data) => StepDefinitionService.update(id, data),
        delete: (id) => StepDefinitionService.delete(id),
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
