import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AdminPermission } from '@allma/core-types';
import { withAdminAuth, AuthContext, createApiGatewayResponse, buildErrorResponse, buildSuccessResponse, log_error } from '@allma/core-sdk';
import { ApiRouter } from './utils/api-router.js';
import { ExecutionMonitoringService } from './services/execution-monitoring.service.js';

const router = new ApiRouter();

// Route for listing executions for a specific flow.
// GET /flow-executions?flowDefinitionId=...
router.get('/flow-executions', async (event, authContext) => {
    const correlationId = event.requestContext.requestId;
    const { flowDefinitionId, flowVersion, status, limit: limitStr, nextToken } = event.queryStringParameters || {};
    
    if (!flowDefinitionId) {
        return createApiGatewayResponse(400, buildErrorResponse('Missing required query parameter: flowDefinitionId', 'VALIDATION_ERROR'), correlationId);
    }
    const limit = limitStr ? parseInt(limitStr, 10) : 50;

    // Construct the filters object conditionally to satisfy exactOptionalPropertyTypes.
    // This ensures keys are only present if their values are defined.
    const filters = {
        ...(flowVersion && { flowVersion }),
        ...(status && { status }),
    };

    // Construct the pagination object conditionally for the same reason.
    const pagination = {
        limit,
        ...(nextToken && { nextToken }),
    };

    const response = await ExecutionMonitoringService.listExecutions(
        flowDefinitionId,
        filters,
        pagination
    );

    return createApiGatewayResponse(200, buildSuccessResponse(response), correlationId);
});

// Route for getting the detailed view of a single execution.
// GET /flow-executions/{flowExecutionId}
router.get('/flow-executions/{flowExecutionId}', async (event, authContext, { flowExecutionId }) => {
    const correlationId = event.requestContext.requestId;
    const details = await ExecutionMonitoringService.getExecutionDetails(flowExecutionId, correlationId);

    if (!details) {
        return createApiGatewayResponse(404, buildErrorResponse(`Execution with ID ${flowExecutionId} not found.`, 'NOT_FOUND'), correlationId);
    }

    return createApiGatewayResponse(200, buildSuccessResponse(details), correlationId);
});

// Route for fetching steps related to a specific parallel branch execution.
// GET /flow-executions/{flowExecutionId}/branch-steps?parentStepInstanceId=...&parentStepStartTime=...
router.get('/flow-executions/{flowExecutionId}/branch-steps', async (event, authContext, { flowExecutionId }) => {
    const correlationId = event.requestContext.requestId;
    const { parentStepInstanceId, parentStepStartTime } = event.queryStringParameters || {};

    if (!parentStepInstanceId || !parentStepStartTime) {
        return createApiGatewayResponse(400, buildErrorResponse('Missing required query parameters: parentStepInstanceId, parentStepStartTime', 'VALIDATION_ERROR'), correlationId);
    }

    const branchSteps = await ExecutionMonitoringService.getBranchSteps(flowExecutionId, parentStepInstanceId, parentStepStartTime, correlationId);
    return createApiGatewayResponse(200, buildSuccessResponse(branchSteps), correlationId);
});

/**
 * Main handler that routes execution monitoring requests.
 */
const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    try {
        if (!authContext.hasPermission(AdminPermission.EXECUTIONS_READ)) {
            return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
        }
        return await router.getHandler()(event, authContext);
    } catch (e: any) {
        log_error('Error in execution-monitoring handler', { error: e.message, path: event.rawPath, method: event.requestContext.http.method }, correlationId);
        if (e.name === 'ValidationError') {
            return createApiGatewayResponse(400, buildErrorResponse(e.message, 'VALIDATION_ERROR'), correlationId);
        }
        return createApiGatewayResponse(500, buildErrorResponse('Failed to retrieve execution data', 'SERVER_ERROR'), correlationId);
    }
};

export const handler = withAdminAuth(mainHandler);
