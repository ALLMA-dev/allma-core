import { v4 as uuidv4 } from 'uuid';
import {
    FlowDefinition, FlowDefinitionSchema, FlowMetadataStorageItem, FlowMetadataStorageItemSchema, ITEM_TYPE_ALLMA_FLOW_DEFINITION, StepType, CreateFlowInput, StepInstance, StepDefinition
} from '@allma/core-types';
import { VersionedEntityManager } from './versioned-entity.service.js';
import { StepDefinitionService } from './step-definition.service.js';
import { EmailMappingService } from './email-mapping.service.js';
import { ScheduleService } from './schedule.service.js';
import { log_info, deepMerge, log_warn, log_error } from '@allma/core-sdk';

/**
 * Hydrates a flow definition by merging properties from referenced step definitions.
 * @param flow The flow definition to hydrate.
 * @returns A promise that resolves to the hydrated flow definition, or undefined if the input is undefined.
 */
async function hydrateFlow(flow: FlowDefinition | undefined): Promise<FlowDefinition | undefined> {
    if (!flow) {
        return undefined;
    }

    const hydratedFlow: FlowDefinition = JSON.parse(JSON.stringify(flow));

    if (!hydratedFlow.steps) {
        return hydratedFlow;
    }

    for (const stepId in hydratedFlow.steps) {
        const stepInstance = hydratedFlow.steps[stepId];

        if (stepInstance.stepDefinitionId) {
            const stepDefFromDb = await StepDefinitionService.get(stepInstance.stepDefinitionId);

            if (stepDefFromDb) {
                // Destructure the step definition to separate its metadata from the base properties that should be inherited.
                const { 
                    id, 
                    name, 
                    version, 
                    createdAt, 
                    updatedAt, 
                    description, 
                    ...baseDefProps 
                } = stepDefFromDb;

                // Merge the base definition properties with the instance-specific overrides.
                // The `stepInstance` properties will correctly overwrite the base properties.
                const hydratedStep = deepMerge(baseDefProps, stepInstance);
                
                // The resulting object now structurally matches StepInstance.
                // We use `as unknown as StepInstance` to bypass complex type inference issues,
                // as we are confident in the structural integrity of the resulting object.
                hydratedFlow.steps[stepId] = hydratedStep as unknown as StepInstance;
            }
        }
    }
    return hydratedFlow;
}


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
        description: input.description ?? null,
        flowVariables: {},
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
 * Custom update logic for Flow Definitions to handle validation and hydration of step properties.
 */
const customUpdateVersion = async (id: string, version: number, data: FlowDefinition,
    options?: { skipValidation?: boolean, ignorePublishedStatus?: boolean }
): Promise<FlowDefinition> => {
    const [oldVersionResult, master] = await Promise.all([
        entityManager.getVersion(id, version),
        entityManager.getMaster(id),
    ]);
    const oldVersion = oldVersionResult === null ? undefined : oldVersionResult;
    // Add flow variables to the old version object before hydrating and diffing.
    if (oldVersion && master) {
        oldVersion.flowVariables = master.flowVariables;
    }

    const hydratedNewVersion = await hydrateFlow(data);
    if (!hydratedNewVersion) {
        throw new Error("Failed to hydrate the new version of the flow for validation.");
    }
    
    // 1. Manually validate the fully hydrated flow object. This will throw a ZodError if invalid.
    FlowDefinitionSchema.parse(hydratedNewVersion);

    // 2. If validation passes, persist the ORIGINAL, UN-HYDRATED flow object.
    const updateOptions: { skipValidation: boolean; ignorePublishedStatus?: boolean } = {
        skipValidation: true, // We've already validated the hydrated version.
    };
    if (options?.ignorePublishedStatus !== undefined) {
        updateOptions.ignorePublishedStatus = options.ignorePublishedStatus;
    }
    const persistedVersion = await entityManager.updateVersion(id, version, data, updateOptions);

    // 3. Hydrate the old version for an accurate diff in the side-effect services.
    const hydratedOldVersion = await hydrateFlow(oldVersion);
    
    // 4. Pass the HYDRATED versions to the sync services.
    await EmailMappingService.syncMappingsForFlowVersion(id, hydratedOldVersion, hydratedNewVersion);
    await ScheduleService.syncSchedulesForFlowVersion(id, hydratedOldVersion, hydratedNewVersion);

    // 5. Return the persisted (un-hydrated) version, which is the source of truth in the DB.
    return persistedVersion;
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
    createVersion: entityManager.createVersion.bind(entityManager),

    /**
     * Retrieves a specific version of a flow, hydrated with its step definitions and flow variables.
     * This is used for API responses and exports.
     * @param id The ID of the flow.
     * @param version The version number or a string like 'latest'.
     * @returns A promise resolving to the fully hydrated FlowDefinition or null.
     */
    async getVersion(id: string, version: string | number): Promise<FlowDefinition | null> {
        const [versionData, masterData] = await Promise.all([
            entityManager.getVersion(id, version),
            entityManager.getMaster(id),
        ]);

        if (!versionData) {
            return null;
        }

        const versionWithVars: FlowDefinition = {
            ...versionData,
            flowVariables: masterData?.flowVariables || {},
        };

        const hydrated = await hydrateFlow(versionWithVars);
        return hydrated ?? null;
    },

    async publishVersion(id: string, version: number): Promise<FlowDefinition> {
        const master = await entityManager.getMaster(id);
        
        const oldPublishedVersionResult = master?.publishedVersion ? await entityManager.getVersion(id, master.publishedVersion) : null;
        let oldPublishedVersion = oldPublishedVersionResult === null ? undefined : oldPublishedVersionResult;
        if (oldPublishedVersion && master) {
            oldPublishedVersion.flowVariables = master.flowVariables;
        }

        let newPublishedVersion = await entityManager.publishVersion(id, version);
        if (newPublishedVersion && master) {
            newPublishedVersion.flowVariables = master.flowVariables;
        }
        
        const hydratedOld = await hydrateFlow(oldPublishedVersion);
        const hydratedNew = await hydrateFlow(newPublishedVersion);

        try {
            await EmailMappingService.syncMappingsForFlowVersion(id, hydratedOld, hydratedNew);
            await ScheduleService.syncSchedulesForFlowVersion(id, hydratedOld, hydratedNew);
        } catch (error: any) {
            if (error.message.startsWith('Email address conflict:')) {
                log_warn(`Rolling back publish for flow ${id} v${version} due to email mapping conflict.`, {}, id);
                try {
                    await entityManager.unpublishVersion(id, version);
                } catch (rollbackError: any) {
                    log_error(`CRITICAL: Failed to roll back publish for flow ${id} v${version}. Manual cleanup may be required.`, { rollbackError: rollbackError.message }, id);
                }
                throw error;
            }
            throw error;
        }

        return newPublishedVersion;
    },

    async unpublishVersion(id: string, version: number): Promise<FlowDefinition> {
        const master = await entityManager.getMaster(id);
        if (!master || !master.publishedVersion) {
            throw new Error(`Flow ${id} is not published or does not exist.`);
        }

        // Explicitly check that the version passed from the API matches the source of truth.
        if (master.publishedVersion !== version) {
            throw new Error(`Version ${version} is not the currently published version. Published version is ${master.publishedVersion}.`);
        }

        const oldPublishedVersionResult = await entityManager.getVersion(id, master.publishedVersion);
        let oldPublishedVersion = oldPublishedVersionResult === null ? undefined : oldPublishedVersionResult;
        if (oldPublishedVersion && master) {
            oldPublishedVersion.flowVariables = master.flowVariables;
        }

        // Call the entity manager with the confirmed published version.
        const unpublishedVersion = await entityManager.unpublishVersion(id, master.publishedVersion);

        const hydratedOld = await hydrateFlow(oldPublishedVersion);
        if (hydratedOld) {
            await EmailMappingService.syncMappingsForFlowVersion(id, hydratedOld, undefined);
            await ScheduleService.syncSchedulesForFlowVersion(id, hydratedOld, undefined);
        }

        return unpublishedVersion;
    },

    async deleteVersion(id: string, version: number): Promise<void> {
        const master = await entityManager.getMaster(id);
        const versionToDeleteResult = await entityManager.getVersion(id, version);
        let versionToDelete = versionToDeleteResult === null ? undefined : versionToDeleteResult;
        
        if (versionToDelete && master) {
            versionToDelete.flowVariables = master.flowVariables;
        }

        const hydratedToDelete = await hydrateFlow(versionToDelete);
        if (hydratedToDelete) {
            await EmailMappingService.syncMappingsForFlowVersion(id, hydratedToDelete, undefined);
            await ScheduleService.syncSchedulesForFlowVersion(id, hydratedToDelete, undefined);
        }
        return entityManager.deleteVersion(id, version);
    },

    // Use the custom update logic for versions
    updateVersion: customUpdateVersion,

    /**
     * Updates the master (metadata) record of a flow.
     */
    async updateMaster(id: string, data: Partial<Omit<FlowMetadataStorageItem, 'PK' | 'SK' | 'itemType' | 'id' | 'createdAt' | 'updatedAt' | 'latestVersion' | 'publishedVersion'>>): Promise<FlowMetadataStorageItem> {
        return entityManager.updateMaster(id, data);
    },

    /**
     * Creates a new flow definition with an initial version.
     */
    async createFlow(input: CreateFlowInput & { emailTriggerAddress?: string }): Promise<{ metadata: FlowMetadataStorageItem, version: FlowDefinition }> {
        const { metadata, version } = await entityManager.createMasterWithInitialVersion(uuidv4(), input);
        const hydratedVersion = await hydrateFlow(version);
        await EmailMappingService.syncMappingsForFlowVersion(metadata.id, undefined, hydratedVersion);
        await ScheduleService.syncSchedulesForFlowVersion(metadata.id, undefined, hydratedVersion);
        return { metadata, version };
    },

    /**
     * Creates a new flow and its first version from a full FlowDefinition object, typically from an import.
     */
    async createFlowFromImport(flow: FlowDefinition): Promise<{ metadata: FlowMetadataStorageItem, version: FlowDefinition }> {
        const createInput: CreateFlowInput = { name: String(flow.name), description: flow.description };
        const { metadata, version } = await entityManager.createMasterWithInitialVersion(flow.id, createInput, flow);
        const hydratedVersion = await hydrateFlow(version);
        await EmailMappingService.syncMappingsForFlowVersion(metadata.id, undefined, hydratedVersion);
        await ScheduleService.syncSchedulesForFlowVersion(metadata.id, undefined, hydratedVersion);
        return { metadata, version };
    },

    /**
     * Clones an existing flow definition, creating a new master and version 1.
     */
    async clone(idToClone: string, newName: string): Promise<FlowMetadataStorageItem> {
        const sourceMetadata = await entityManager.getMaster(idToClone);
        if (!sourceMetadata) throw new Error(`Source flow ${idToClone} not found.`);

        const { metadata } = await entityManager.clone(
            idToClone,
            { name: newName, description: `Cloned from ${sourceMetadata.name}` },
            (sourceData, newInitialVersion) => {
                return {
                    ...sourceData,
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