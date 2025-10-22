import { v4 as uuidv4 } from 'uuid';
import {
    FlowDefinition, FlowDefinitionSchema, FlowMetadataStorageItem, FlowMetadataStorageItemSchema, ITEM_TYPE_ALLMA_FLOW_DEFINITION, StepType, CreateFlowInput, StepInstance, ENV_VAR_NAMES
} from '@allma/core-types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { VersionedEntityManager } from './versioned-entity.service.js';
import { StepDefinitionService } from './step-definition.service.js';
import { log_info, log_error } from '@allma/core-sdk';

const EMAIL_MAPPING_TABLE_NAME = process.env.EMAIL_TO_FLOW_MAPPING_TABLE_NAME!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const initialVersionFactory = (id: string, now: string, input: CreateFlowInput): FlowDefinition => {
    const startStepId = `start_step_${uuidv4().substring(0, 8)}`;
    return {
        id,
        version: 1,
        isPublished: false,
        steps: {
            [startStepId]: {
                stepInstanceId: startStepId,
                stepType: StepType.NO_OP,
                displayName: 'Start',
                stepDefinitionId: 'system-noop',
                position: { x: 250, y: 50 },
            }
        },
        startStepInstanceId: startStepId,
        enableExecutionLogs: false,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        description: input.description,
    };
};

const entityManager = new VersionedEntityManager<FlowMetadataStorageItem, FlowDefinition, CreateFlowInput>({
    pkPrefix: 'FLOW_DEF#',
    entityName: 'Flow',
    itemType: ITEM_TYPE_ALLMA_FLOW_DEFINITION,
    masterSchema: FlowMetadataStorageItemSchema,
    versionSchema: FlowDefinitionSchema,
    initialVersionFactory,
});

/**
 * Manages the EmailToFlowMappingTable to ensure data consistency.
 */
async function manageEmailMapping(oldEmail: string | null | undefined, newEmail: string | null | undefined, flowId: string, flowName: string): Promise<void> {
    if (oldEmail === newEmail) {
        return; // No change needed
    }

    const transactItems = [];

    // If an old email existed, we need to remove its mapping.
    if (oldEmail) {
        log_info(`Removing old email mapping for flow`, { flowId, oldEmail });
        transactItems.push({
            Delete: {
                TableName: EMAIL_MAPPING_TABLE_NAME,
                Key: { emailAddress: oldEmail },
            },
        });
    }

    // If a new email is provided, we need to create the new mapping.
    if (newEmail) {
        log_info(`Creating new email mapping for flow`, { flowId, newEmail });
        transactItems.push({
            Put: {
                TableName: EMAIL_MAPPING_TABLE_NAME,
                Item: {
                    emailAddress: newEmail,
                    flowDefinitionId: flowId,
                    flowName: flowName,
                },
                // This condition ensures the email address is not already mapped to another flow, enforcing uniqueness.
                ConditionExpression: 'attribute_not_exists(emailAddress)',
            },
        });
    }

    if (transactItems.length > 0) {
        try {
            await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
        } catch (error: any) {
            if (error.name === 'TransactionCanceledException' && error.message.includes('ConditionalCheckFailed')) {
                log_error('Failed to create email mapping because the address is already in use.', { newEmail, flowId });
                throw new Error(`Email address '${newEmail}' is already assigned to another flow.`);
            }
            log_error('Failed to update email mapping table transactionally.', { error: error.message });
            throw error; // Re-throw other errors
        }
    }
}


/**
 * Custom update logic for Flow Definitions to handle validation and hydration of step properties.
 */
const customUpdateVersion = async (id: string, version: number, data: FlowDefinition): Promise<FlowDefinition> => {
    // 1. Create a deep copy for validation to avoid mutating the original data.
    const flowForValidation: FlowDefinition = JSON.parse(JSON.stringify(data));

    // 2. Hydrate steps that have a stepDefinitionId by merging properties.
    for (const stepId in flowForValidation.steps) {
        const stepInstanceFromPayload = flowForValidation.steps[stepId];
        
        if (stepInstanceFromPayload.stepDefinitionId) {
            const stepDefFromDb = await StepDefinitionService.get(stepInstanceFromPayload.stepDefinitionId);

            if (stepDefFromDb) {
                // Create a hydrated step. Start with the definition as the base,
                // then spread the instance from the payload on top to apply overrides.
                const hydratedStep = { ...stepDefFromDb, ...stepInstanceFromPayload };

                // Clean up properties that belong only to the StepDefinition schema
                // to produce a valid StepInstance shape.
                delete (hydratedStep as any).id;
                delete (hydratedStep as any).name;
                delete (hydratedStep as any).createdAt;
                delete (hydratedStep as any).updatedAt;
                delete (hydratedStep as any).version;
                delete (hydratedStep as any).description;

                flowForValidation.steps[stepId] = hydratedStep as StepInstance;
            } else {
                log_info(`Step definition '${stepInstanceFromPayload.stepDefinitionId}' not found for step '${stepId}' during validation.`, { flowId: id, version });
            }
        }
    }
    
    // 3. Manually validate the fully hydrated flow object. This will throw a ZodError if invalid.
    FlowDefinitionSchema.parse(flowForValidation);

    // 4. If validation passes, persist the HYDRATED AND VALIDATED flow object.
    return entityManager.updateVersion(id, version, data, { skipValidation: true });
};

/**
 * Service for managing Flow Definition entities.
 * This service acts as a domain-specific layer on top of the generic VersionedEntityManager.
 */
export const FlowDefinitionService = {
    // Expose most generic CRUD and versioning methods from the entity manager
    listMasters: (filters?: { tag?: string; searchText?: string }) => entityManager.listMasters(filters),
    getAllTags: entityManager.getAllTags.bind(entityManager),
    getMaster: entityManager.getMaster.bind(entityManager),
    listVersions: entityManager.listVersions.bind(entityManager),
    getVersion: entityManager.getVersion.bind(entityManager),
    createVersion: entityManager.createVersion.bind(entityManager),
    publishVersion: entityManager.publishVersion.bind(entityManager),
    unpublishVersion: entityManager.unpublishVersion.bind(entityManager),
    deleteVersion: entityManager.deleteVersion.bind(entityManager),
    
    // Use the custom update logic for versions
    updateVersion: customUpdateVersion,

    /**
     * Updates the master (metadata) record of a flow, including managing the email trigger mapping.
     */
    async updateMaster(id: string, data: Partial<Omit<FlowMetadataStorageItem, 'PK' | 'SK' | 'itemType' | 'id' | 'createdAt' | 'updatedAt' | 'latestVersion' | 'publishedVersion'>>): Promise<FlowMetadataStorageItem> {
        const existingMaster = await entityManager.getMaster(id);
        if (!existingMaster) {
            throw new Error(`Flow with id ${id} not found.`);
        }
        
        // Handle email mapping logic
        if (EMAIL_MAPPING_TABLE_NAME && 'emailTriggerAddress' in data) {
            await manageEmailMapping(existingMaster.emailTriggerAddress, data.emailTriggerAddress, id, data.name || existingMaster.name);
        }

        return entityManager.updateMaster(id, data);
    },

    /**
     * Creates a new flow definition with an initial version.
     * @param input The data for the new flow.
     * @returns An object containing the new metadata and the initial version.
     */
    async createFlow(input: CreateFlowInput & { emailTriggerAddress?: string }): Promise<{ metadata: FlowMetadataStorageItem, version: FlowDefinition }> {
        const id = uuidv4();
        if (EMAIL_MAPPING_TABLE_NAME && input.emailTriggerAddress) {
            await manageEmailMapping(null, input.emailTriggerAddress, id, input.name);
        }
        return entityManager.createMasterWithInitialVersion(id, input);
    },

    /**
     * Clones an existing flow definition, creating a new master and version 1.
     * @param idToClone The ID of the flow definition to clone.
     * @param newName The name for the new cloned flow.
     * @returns The metadata item for the newly cloned flow.
     */
    async clone(idToClone: string, newName: string): Promise<FlowMetadataStorageItem> {
        const sourceMetadata = await entityManager.getMaster(idToClone);
        if (!sourceMetadata) throw new Error(`Source flow ${idToClone} not found.`);

        const { metadata } = await entityManager.clone(
            idToClone,
            { name: newName, description: `Cloned from ${sourceMetadata.name}` },
            (sourceData, newInitialVersion) => {
                // This transformer function merges data from the source version
                // into the newly created initial version.
                return {
                    ...sourceData,
                    // Overwrite fields that must be unique to the new version
                    name: newInitialVersion.name,
                    description: newInitialVersion.description,
                    isPublished: false,
                    publishedAt: null,
                };
            }
        );
        return metadata;
    }
};