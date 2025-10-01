import { v4 as uuidv4 } from 'uuid';
import {
    PromptTemplate, PromptTemplateSchema, PromptTemplateMetadataStorageItem, PromptTemplateMetadataStorageItemSchema, ITEM_TYPE_ALLMA_PROMPT_TEMPLATE, CreatePromptTemplateInput
} from '@allma/core-types';
import { VersionedEntityManager } from './versioned-entity.service.js';

const initialVersionFactory = (id: string, now: string, input: CreatePromptTemplateInput): PromptTemplate => ({
    id,
    version: 1,
    name: input.name,
    description: input.description,
    content: `Your prompt content for {{variable}} goes here.`,
    isPublished: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
});

const entityManager = new VersionedEntityManager<PromptTemplateMetadataStorageItem, PromptTemplate, CreatePromptTemplateInput>({
    pkPrefix: 'PROMPT_TEMPLATE#',
    entityName: 'Prompt Template',
    itemType: ITEM_TYPE_ALLMA_PROMPT_TEMPLATE,
    masterSchema: PromptTemplateMetadataStorageItemSchema,
    versionSchema: PromptTemplateSchema,
    initialVersionFactory,
});

/**
 * Service for managing Prompt Template entities.
 * This service acts as a domain-specific layer on top of the generic VersionedEntityManager.
 */
export const PromptTemplateService = {
    // Expose all generic CRUD and versioning methods from the entity manager
    listMasters: entityManager.listMasters.bind(entityManager),
    getMaster: entityManager.getMaster.bind(entityManager),
    updateMaster: entityManager.updateMaster.bind(entityManager),
    listVersions: entityManager.listVersions.bind(entityManager),
    getVersion: entityManager.getVersion.bind(entityManager),
    createVersion: entityManager.createVersion.bind(entityManager),
    updateVersion: entityManager.updateVersion.bind(entityManager),
    publishVersion: entityManager.publishVersion.bind(entityManager),
    unpublishVersion: entityManager.unpublishVersion.bind(entityManager),
    deleteVersion: entityManager.deleteVersion.bind(entityManager),
    
    /**
     * Creates a new prompt template with an initial version.
     * @param input The data for the new prompt.
     * @returns The newly created initial version of the prompt.
     */
    async createPrompt(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
        const id = uuidv4();
        const { version } = await entityManager.createMasterWithInitialVersion(id, input);
        return version;
    },

    /**
     * Clones an existing prompt template, creating a new master and version 1.
     * @param idToClone The ID of the prompt template to clone.
     * @param newName The name for the new cloned prompt.
     * @returns The initial version of the newly cloned prompt.
     */
    async clone(idToClone: string, newName: string): Promise<PromptTemplate> {
        const { version } = await entityManager.clone(
            idToClone,
            { name: newName, description: `Cloned from prompt ID ${idToClone}` },
            (sourceData, newInitialVersion) => {
                // This transformer function merges data from the source version
                // into the newly created initial version.
                return {
                    ...newInitialVersion,
                    content: sourceData.content, // Copy the content from the source.
                    tags: sourceData.tags,       // Copy the tags.
                };
            }
        );
        return version;
    }
};