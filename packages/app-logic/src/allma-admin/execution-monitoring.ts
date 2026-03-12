import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AdminPermission, S3PointerSchema } from '@allma/core-types';
import { withAdminAuth, AuthContext, createApiGatewayResponse, buildErrorResponse, buildSuccessResponse, log_error, resolveS3Pointer } from '@allma/core-sdk';
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

    const filters = {
        ...(flowVersion && { flowVersion }),
        ...(status && { status }),
    };

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

// Route for getting the detailed view of a single step.
// GET /flow-executions/{flowExecutionId}/step-record
router.get('/flow-executions/{flowExecutionId}/step-record', async (event, authContext, { flowExecutionId }) => {
    const correlationId = event.requestContext.requestId;
    const { stepInstanceId, attemptNumber, branchExecutionId } = event.queryStringParameters || {};

    if (!stepInstanceId) {
        return createApiGatewayResponse(400, buildErrorResponse('Missing required query parameter: stepInstanceId', 'VALIDATION_ERROR'), correlationId);
    }

    const details = await ExecutionMonitoringService.getStepRecordDetails(
        flowExecutionId, 
        stepInstanceId, 
        attemptNumber ? parseInt(attemptNumber, 10) : undefined,
        branchExecutionId,
        correlationId
    );

    if (!details) {
        return createApiGatewayResponse(404, buildErrorResponse(`Step record not found.`, 'NOT_FOUND'), correlationId);
    }

    return createApiGatewayResponse(200, buildSuccessResponse(details), correlationId);
});

// Route for fetching steps related to a specific parallel branch execution.
// GET /flow-executions/{flowExecutionId}/branch-steps?parentStepInstanceId=...&parentStepStartTime=...
router.get('/flow-executions/{flowExecutionId}/branch-steps', async (event, authContext, { flowExecutionId }) => {
    const correlationId = event.requestContext.requestId;
    const { parentStepInstanceId, parentStepStartTime, limit, offset } = event.queryStringParameters || {};

    if (!parentStepInstanceId || !parentStepStartTime) {
        return createApiGatewayResponse(400, buildErrorResponse('Missing required query parameters: parentStepInstanceId, parentStepStartTime', 'VALIDATION_ERROR'), correlationId);
    }

    const limitNum = limit ? parseInt(limit, 10) : 30;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const branchSteps = await ExecutionMonitoringService.getBranchSteps(
        flowExecutionId, 
        parentStepInstanceId, 
        parentStepStartTime, 
        correlationId, 
        limitNum, 
        offsetNum
    );
    return createApiGatewayResponse(200, buildSuccessResponse(branchSteps), correlationId);
});

// Route for resolving S3 pointers directly
// POST /tools/resolve-s3
router.post('/tools/resolve-s3', async (event, authContext) => {
    const correlationId = event.requestContext.requestId;
    try {
        const body = JSON.parse(event.body || '{}');
        const validation = S3PointerSchema.safeParse(body.pointer);
        
        if (!validation.success) {
            return createApiGatewayResponse(400, buildErrorResponse('Missing or invalid S3 pointer', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
        }
        
        // Use skipSizeLimit = false to protect API gateway limits; it will return a presigned URL if over 4MB.
        const data = await resolveS3Pointer(validation.data, correlationId, false);
        return createApiGatewayResponse(200, buildSuccessResponse(data), correlationId);
    } catch (e: any) {
        log_error('Failed to resolve S3 pointer via API', { error: e.message }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Failed to resolve S3 pointer', 'SERVER_ERROR', { error: e.message }), correlationId);
    }
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