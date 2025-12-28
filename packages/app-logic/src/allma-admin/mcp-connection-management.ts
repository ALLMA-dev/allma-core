import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { McpConnectionService } from './services/mcp-connection.service.js';
import { discoverTools } from '../allma-core/utils/mcp-client.js';
import {
  CreateMcpConnectionInputSchema,
  UpdateMcpConnectionInputSchema,
  AdminPermission,
} from '@allma/core-types';
import {
    withAdminAuth,
    AuthContext,
    createApiGatewayResponse,
    buildSuccessResponse,
    buildErrorResponse,
    log_info,
    log_error,
} from '@allma/core-sdk';
import { ApiRouter } from './utils/api-router.js';

const router = new ApiRouter();

// GET /allma/mcp-connections
router.get('/allma/mcp-connections', async (event, authContext) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_READ)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    const items = await McpConnectionService.list();
    return createApiGatewayResponse(200, buildSuccessResponse(items), correlationId);
});

// POST /allma/mcp-connections
router.post('/allma/mcp-connections', async (event, authContext) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_WRITE)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    const validation = CreateMcpConnectionInputSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!validation.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input.', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
    }
    const newItem = await McpConnectionService.create(validation.data);
    return createApiGatewayResponse(201, buildSuccessResponse(newItem), correlationId);
});

// GET /allma/mcp-connections/{connectionId}
router.get('/allma/mcp-connections/{connectionId}', async (event, authContext, { connectionId }) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_READ)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    const item = await McpConnectionService.get(connectionId);
    if (!item) {
        return createApiGatewayResponse(404, buildErrorResponse('Connection not found.', 'NOT_FOUND'), correlationId);
    }
    return createApiGatewayResponse(200, buildSuccessResponse(item), correlationId);
});

// PUT /allma/mcp-connections/{connectionId}
router.put('/allma/mcp-connections/{connectionId}', async (event, authContext, { connectionId }) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_WRITE)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    const validation = UpdateMcpConnectionInputSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!validation.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input.', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
    }
    // Filter out undefined values to match the expected Partial type
    const updateData = Object.fromEntries(
        Object.entries(validation.data).filter(([_, value]) => value !== undefined)
    );
    const updatedItem = await McpConnectionService.update(connectionId, updateData);
    return createApiGatewayResponse(200, buildSuccessResponse(updatedItem), correlationId);
});

// DELETE /allma/mcp-connections/{connectionId}
router.delete('/allma/mcp-connections/{connectionId}', async (event, authContext, { connectionId }) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_DELETE)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    await McpConnectionService.delete(connectionId);
    return createApiGatewayResponse(204, buildSuccessResponse(null), correlationId);
});

// POST /allma/mcp-connections/{connectionId}/discover
router.post('/allma/mcp-connections/{connectionId}/discover', async (event, authContext, { connectionId }) => {
    const correlationId = event.requestContext.requestId;
    if (!authContext.hasPermission(AdminPermission.DEFINITIONS_READ)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }
    const connection = await McpConnectionService.get(connectionId);
    if (!connection) {
        return createApiGatewayResponse(404, buildErrorResponse('Connection not found.', 'NOT_FOUND'), correlationId);
    }
    const tools = await discoverTools(connection);
    return createApiGatewayResponse(200, buildSuccessResponse(tools), correlationId);
});


const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    log_info(`[${authContext.username}] requested MCP connection action: ${event.requestContext.http.method} ${event.rawPath}`, {}, correlationId);
    try {
        return await router.getHandler()(event, authContext);
    } catch (e: any) {
        // Add richer debug logging to capture the full error object.
        log_error('Full error object in MCP connection management handler', { 
            name: e.name, 
            message: e.message, 
            stack: e.stack, 
            details: (e as any).details 
        }, correlationId);

        log_error('Error in MCP connection management handler', { error: e.message, path: event.rawPath, method: event.requestContext.http.method }, correlationId);
        
        if (e.message.includes('not found')) {
            return createApiGatewayResponse(404, buildErrorResponse(e.message, 'NOT_FOUND'), correlationId);
        }
        return createApiGatewayResponse(500, buildErrorResponse('Failed to process MCP connection request', 'SERVER_ERROR'), correlationId);
    }
};

export const handler = withAdminAuth(mainHandler);