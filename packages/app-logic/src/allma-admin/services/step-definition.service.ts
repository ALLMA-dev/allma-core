import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
    ITEM_TYPE_ALLMA_STEP_DEFINITION,
    ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
    StepDefinition,
    StepDefinitionSchema,
    CreateStepDefinitionInput,
    ExternalStepRegistryItem,
    ENV_VAR_NAMES,
} from '@allma/core-types';
import { GenericEntityManager } from './generic-entity.service.js';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
});

const stepDefinitionManager = new GenericEntityManager<StepDefinition>({
    pkPrefix: 'STEP_DEF#',
    entityName: 'Step Definition',
    itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
    schema: StepDefinitionSchema,
});

const createWithId = async (data: CreateStepDefinitionInput): Promise<StepDefinition> => {
    const id = `usr-${uuidv4()}`;
    const now = new Date().toISOString();
    const fullData = { ...data, id, version: 1, createdAt: now, updatedAt: now };
    return stepDefinitionManager.create(fullData as any);
};

const listExternalSteps = async (): Promise<ExternalStepRegistryItem[]> => {
    const tableName = process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME] || process.env.ALLMA_CONFIG_TABLE_NAME;
    if (!tableName) {
        throw new Error(`Missing required environment variable: ${ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME}`);
    }

    const query = new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI_ItemType_Id',
        KeyConditionExpression: 'itemType = :itemType',
        ExpressionAttributeValues: {
            ':itemType': ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
        },
    });

    const result = await ddbDocClient.send(query);
    return (result.Items || []) as ExternalStepRegistryItem[];
};

export const StepDefinitionService = {
    list: stepDefinitionManager.list.bind(stepDefinitionManager),
    get: stepDefinitionManager.get.bind(stepDefinitionManager),
    create: createWithId,
    update: stepDefinitionManager.update.bind(stepDefinitionManager),
    delete: stepDefinitionManager.delete.bind(stepDefinitionManager),
    listExternalSteps,
};
