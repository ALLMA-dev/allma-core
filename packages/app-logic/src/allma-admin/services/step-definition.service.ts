import { v4 as uuidv4 } from 'uuid';
import { ITEM_TYPE_ALLMA_STEP_DEFINITION, StepDefinition, StepDefinitionSchema, CreateStepDefinitionInput } from '@allma/core-types';
import { GenericEntityManager } from './generic-entity.service.js';

const stepDefinitionManager = new GenericEntityManager<StepDefinition>({
    pkPrefix: 'STEP_DEF#',
    entityName: 'Step Definition',
    itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
    // The base schema for validation. The manager handles createdAt/updatedAt.
    schema: StepDefinitionSchema,
});

// Wrapper to handle ID generation for new step definitions.
const createWithId = async (data: CreateStepDefinitionInput): Promise<StepDefinition> => {
    // Prefix with 'usr-' to distinguish from system definitions.
    const id = `usr-${uuidv4()}`;
    // The `create` method of the manager expects the full entity minus timestamps.
    const now = new Date().toISOString();
    const fullData = { ...data, id, version: 1, createdAt: now, updatedAt: now };
    return stepDefinitionManager.create(fullData as any);
};


export const StepDefinitionService = {
    list: stepDefinitionManager.list.bind(stepDefinitionManager),
    get: stepDefinitionManager.get.bind(stepDefinitionManager),
    create: createWithId,
    update: stepDefinitionManager.update.bind(stepDefinitionManager),
    delete: stepDefinitionManager.delete.bind(stepDefinitionManager),
};
