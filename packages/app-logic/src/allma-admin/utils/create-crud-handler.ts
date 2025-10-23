import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { AdminPermission } from '@allma/core-types';
import { withAdminAuth, AuthContext, createApiGatewayResponse, buildSuccessResponse, buildErrorResponse, log_error, log_info, log_warn, deepMerge } from '@allma/core-sdk';
import { ApiRouter } from './api-router.js';

/**
 * Formats a Zod validation error into a human-readable string for logging and UI feedback.
 * @param error The ZodError instance.
 * @returns A formatted string detailing the validation errors.
 */
function formatZodError(error: z.ZodError): string {
    const { fieldErrors, formErrors } = error.flatten();
    const errorMessages: string[] = [];

    if (formErrors.length > 0) {
        errorMessages.push(...formErrors);
    }

    for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages) {
            errorMessages.push(`Field '${field}': ${messages.join(', ')}`);
        }
    }
    return errorMessages.join('; ');
}

/**
 * Parses the JSON body of an API Gateway event and validates it against a Zod schema.
 * @param body The event body string.
 * @param schema The Zod schema for validation.
 * @returns A Zod safe parse result.
 */
function parseJsonBody<T>(body: string | undefined, schema: z.ZodType<T>) {
    try {
        const parsed = JSON.parse(body || '{}');
        return schema.safeParse(parsed);
    } catch (e) {
        return { success: false, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: 'Invalid JSON format', path: [] }]) } as const;
    }
}

/**
 * Wraps a service call with standardized response and error handling.
 * @param serviceCall A function that returns a promise resolving to the data.
 * @param correlationId The request correlation ID for logging.
 * @param successCode The HTTP status code for a successful response.
 * @returns A promise resolving to an APIGatewayProxyResultV2.
 */
async function handleServiceCall(serviceCall: () => Promise<any>, correlationId: string, successCode: number = 200): Promise<APIGatewayProxyResultV2> {
    try {
        const data = await serviceCall();
        if (data === null) {
            return createApiGatewayResponse(404, buildErrorResponse('Resource not found', 'NOT_FOUND'), correlationId);
        }
        if (successCode === 204) {
            return createApiGatewayResponse(204, buildSuccessResponse(null), correlationId);
        }
        return createApiGatewayResponse(successCode, buildSuccessResponse(data), correlationId);
    } catch (e: any) {
        log_error('Service call failed in CRUD handler', { error: e.message, name: e.name }, correlationId);
        // Specific handling for Zod validation errors, which may be thrown from the service layer.
        if (e instanceof z.ZodError) {
            const formattedMessage = formatZodError(e);
            return createApiGatewayResponse(400, buildErrorResponse(`Validation failed on merged data: ${formattedMessage}`, 'VALIDATION_ERROR', e.flatten()), correlationId);
        }
        if (e.name === 'ConditionalCheckFailedException' || e.message.includes('not the one currently published') || e.message.includes('Cannot delete')) {
            return createApiGatewayResponse(409, buildErrorResponse(e.message, 'CONFLICT'), correlationId);
        }
        if (e.message.includes('not found')) {
            return createApiGatewayResponse(404, buildErrorResponse(e.message, 'NOT_FOUND'), correlationId);
        }
        return createApiGatewayResponse(500, buildErrorResponse(e.message, 'SERVER_ERROR'), correlationId);
    }
}

// Configuration for a generic, non-versioned entity handler
interface GenericEntityConfig {
    isVersioned: false;
    service: {
        list: (event?: APIGatewayProxyEventV2) => Promise<any[]>;
        get: (id: string) => Promise<any | null>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<void>;
    };
    schemas: {
        create: z.ZodSchema;
        update: z.ZodSchema;
    };
}

// Configuration for a versioned entity handler
interface VersionedEntityConfig {
    isVersioned: true;
    service: {
        listMasters: (filters?: { tag?: string; searchText?: string }) => Promise<any[]>;
        listTags?: () => Promise<string[]>;
        create: (data: any) => Promise<any>;
        clone: (id: string, data: any) => Promise<any>;
        getMaster: (id: string) => Promise<any | null>;
        updateMaster: (id: string, data: any) => Promise<any>;
        listVersions: (id: string) => Promise<any[]>;
        createVersion: (id: string, data: any) => Promise<any>;
        getVersion: (id: string, version: string | number) => Promise<any | null>;
        updateVersion: (id: string, version: number, data: any) => Promise<any>;
        publishVersion: (id: string, version: number) => Promise<any>;
        unpublishVersion: (id: string, version: number) => Promise<any>;
        deleteVersion: (id: string, version: number) => Promise<void>;
    };
    schemas: {
        createMaster: z.ZodSchema;
        updateMaster: z.ZodSchema;
        cloneMaster: z.ZodSchema;
        createVersion: z.ZodSchema;
        updateVersion: z.ZodSchema;
    };
}

type CrudHandlerConfig = {
    permissions: { read: AdminPermission; write: AdminPermission; delete: AdminPermission; };
    basePath: string;
    idParamName?: string;
    versionParamName?: string;
} & (GenericEntityConfig | VersionedEntityConfig);


export function createCrudHandler(config: CrudHandlerConfig) {
    const router = new ApiRouter();
    const idParam = config.idParamName || 'id';

    const readPermission = { requiredPermission: config.permissions.read };
    const writePermission = { requiredPermission: config.permissions.write };
    const deletePermission = { requiredPermission: config.permissions.delete };

    const listPath = config.basePath;
    const detailPath = `${config.basePath}/{${idParam}}`;

    router.get(listPath, (event) => {
        const filters: { tag?: string; searchText?: string } = {};
        if (event.queryStringParameters?.tag) {
            filters.tag = event.queryStringParameters.tag;
        }
        if (event.queryStringParameters?.searchText) {
            filters.searchText = event.queryStringParameters.searchText;
        }
        const listCall = config.isVersioned
            ? () => config.service.listMasters(filters)
            : () => config.service.list(event);
        return handleServiceCall(listCall, event.requestContext.requestId);
    }, readPermission);

    router.get(detailPath, (event, auth, params) => handleServiceCall(
        () => (config.isVersioned ? config.service.getMaster : config.service.get)(params[idParam]),
        event.requestContext.requestId
    ), readPermission);

    router.post(listPath, async (event) => {
        const schema = config.isVersioned ? config.schemas.createMaster : config.schemas.create;
        const validation = parseJsonBody(event.body, schema);
        if (!validation.success) {
            const formattedError = formatZodError(validation.error);
            const errorMessage = `Invalid input: ${formattedError}`;
            log_warn(errorMessage, { details: validation.error.flatten() }, event.requestContext.requestId);
            return createApiGatewayResponse(400, buildErrorResponse(errorMessage, 'VALIDATION_ERROR', validation.error.flatten()), event.requestContext.requestId);
        }
        
        return handleServiceCall(() => config.service.create(validation.data), event.requestContext.requestId, 201);
    }, writePermission);

    router.put(detailPath, async (event, auth, params) => {
        const schema = config.isVersioned ? config.schemas.updateMaster : config.schemas.update;
        const validation = parseJsonBody(event.body, schema);
        if (!validation.success) {
            const formattedError = formatZodError(validation.error);
            const errorMessage = `Invalid input: ${formattedError}`;
            log_warn(errorMessage, { details: validation.error.flatten() }, event.requestContext.requestId);
            return createApiGatewayResponse(400, buildErrorResponse(errorMessage, 'VALIDATION_ERROR', validation.error.flatten()), event.requestContext.requestId);
        }
        
        return handleServiceCall(() => (config.isVersioned ? config.service.updateMaster : config.service.update)(params[idParam], validation.data), event.requestContext.requestId);
    }, writePermission);

    if (config.isVersioned) {
        const versionParam = config.versionParamName || 'version';
        const listVersionsPath = `${detailPath}/versions`;
        const versionDetailPath = `${listVersionsPath}/{${versionParam}}`;
        const clonePath = `${detailPath}/clone`;
        const publishPath = `${versionDetailPath}/publish`;
        const unpublishPath = `${versionDetailPath}/unpublish`;
        
        router.get(listVersionsPath, (e, a, p) => handleServiceCall(() => config.service.listVersions(p[idParam]), e.requestContext.requestId), readPermission);
        router.get(versionDetailPath, (e, a, p) => handleServiceCall(() => config.service.getVersion(p[idParam], p[versionParam]), e.requestContext.requestId), readPermission);
        router.post(clonePath, async (e, a, p) => {
            const v = parseJsonBody(e.body, config.schemas.cloneMaster);
            if (!v.success) return createApiGatewayResponse(400, buildErrorResponse('Invalid input', 'VALIDATION_ERROR', v.error.flatten()), e.requestContext.requestId);
            // The clone service expects the name as a string, not the whole input object.
            return handleServiceCall(() => config.service.clone(p[idParam], (v.data as { name: string }).name), e.requestContext.requestId, 201);
        }, writePermission);
        
    router.post(listVersionsPath, async (e, _a, p) => {
            const v = parseJsonBody(e.body, config.schemas.createVersion);
            if (!v.success) return createApiGatewayResponse(400, buildErrorResponse('Invalid input', 'VALIDATION_ERROR', v.error.flatten()), e.requestContext.requestId);
            return handleServiceCall(() => config.service.createVersion(p[idParam], v.data.sourceVersion), e.requestContext.requestId, 201);
        }, writePermission);
        
    router.put(versionDetailPath, async (e, _a, p) => {
            const bodyValidation = parseJsonBody(e.body, config.schemas.updateVersion);
            if (!bodyValidation.success) {
                const formattedError = formatZodError(bodyValidation.error);
                const errorMessage = `Invalid input for update: ${formattedError}`;
                log_warn(errorMessage, { details: bodyValidation.error.flatten() }, e.requestContext.requestId);
                return createApiGatewayResponse(400, buildErrorResponse(errorMessage, 'VALIDATION_ERROR', bodyValidation.error.flatten()), e.requestContext.requestId);
            }
            
            const existingVersion = await config.service.getVersion(p[idParam], p[versionParam]);
            if (!existingVersion) {
                return createApiGatewayResponse(404, buildErrorResponse('Version not found', 'NOT_FOUND'), e.requestContext.requestId);
            }
            
            const mergedData = {
                ...deepMerge(existingVersion, bodyValidation.data),
                ...(bodyValidation.data.steps && { steps: bodyValidation.data.steps }),
            };
            
            // The service call will now receive the full, merged object for validation and persistence.
            return handleServiceCall(() => config.service.updateVersion(p[idParam], Number(p[versionParam]), mergedData), e.requestContext.requestId);
        }, writePermission);
        
    router.post(publishPath, (e, _a, p) => handleServiceCall(() => config.service.publishVersion(p[idParam], Number(p[versionParam])), e.requestContext.requestId), writePermission);
    router.post(unpublishPath, (e, _a, p) => handleServiceCall(() => config.service.unpublishVersion(p[idParam], Number(p[versionParam])), e.requestContext.requestId), writePermission);
    router.delete(versionDetailPath, (e, _a, p) => handleServiceCall(() => config.service.deleteVersion(p[idParam], Number(p[versionParam])), e.requestContext.requestId, 204), deletePermission);
    } else {
    router.delete(detailPath, (e, _a, p) => handleServiceCall(() => config.service.delete(p[idParam]), e.requestContext.requestId, 204), deletePermission);
    }

    const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
        const correlationId = event.requestContext.requestId;
        log_info(`[${authContext.username}] requested ${event.requestContext.http.method} ${event.rawPath}`, {}, correlationId);
        
        if (!authContext.hasPermission(config.permissions.read)) {
             return createApiGatewayResponse(403, buildErrorResponse('Forbidden: You do not have permission to read this resource.', 'FORBIDDEN'), correlationId);
        }

        if (config.isVersioned && event.requestContext.http.method === 'GET' && event.rawPath === `${config.basePath}/tags`) {
            if (config.service.listTags) {
                return handleServiceCall(config.service.listTags, correlationId);
            }
        }
        
        return router.getHandler()(event, authContext);
    };

    return withAdminAuth(mainHandler);
}