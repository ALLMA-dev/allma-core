import {
    AdminPermission, CreatePromptTemplateInputSchema, UpdatePromptTemplateInputSchema,
    CreatePromptVersionInputSchema, ClonePromptInputSchema
} from '@allma/core-types';
import { PromptTemplateService } from './services/prompt-template.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';
import z from 'zod';

/**
 * Main handler for all Prompt Template management API requests.
 * This handler is created by a generic factory, which wires up all the necessary
 * routing, validation, and service calls based on the provided configuration.
 */
export const handler = createCrudHandler({
    isVersioned: true,
    service: {
        listMasters: PromptTemplateService.listMasters,
        create: PromptTemplateService.createPrompt,
        clone: PromptTemplateService.clone,
        getMaster: PromptTemplateService.getMaster,
        updateMaster: PromptTemplateService.updateMaster,
        listVersions: PromptTemplateService.listVersions,
        createVersion: PromptTemplateService.createVersion,
        getVersion: PromptTemplateService.getVersion,
        updateVersion: PromptTemplateService.updateVersion,
        publishVersion: PromptTemplateService.publishVersion,
        unpublishVersion: PromptTemplateService.unpublishVersion,
        deleteVersion: PromptTemplateService.deleteVersion,
    },
    schemas: {
        createMaster: CreatePromptTemplateInputSchema,
        updateMaster: z.object({}), 
        cloneMaster: ClonePromptInputSchema,
        createVersion: CreatePromptVersionInputSchema,
        updateVersion: UpdatePromptTemplateInputSchema,
    },
    permissions: {
        read: AdminPermission.DEFINITIONS_READ,
        write: AdminPermission.DEFINITIONS_WRITE,
        delete: AdminPermission.DEFINITIONS_DELETE,
    },
    basePath: '/allma/prompt-templates',
    idParamName: 'promptId',
    versionParamName: 'versionNumber',
});