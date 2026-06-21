import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AdminPermission } from '@allma/core-types';
import {
    withAdminAuth,
    AuthContext,
    createApiGatewayResponse,
    buildSuccessResponse,
    buildErrorResponse,
    log_error,
    log_info,
} from '@allma/core-sdk';
import { getStepStats, StepStatsFilters } from './services/step-stats.service.js';

/**
 * Returns aggregated per-step execution statistics (counts, duration, token usage) over the
 * last 24h and 7d, with optional `?stepType=` / `?flowDefinitionId=` drill-down filters.
 */
const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;

    if (!authContext.hasPermission(AdminPermission.DASHBOARD_VIEW)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }

    const { stepType, flowDefinitionId } = event.queryStringParameters || {};
    const filters: StepStatsFilters = {
        ...(stepType && { stepType }),
        ...(flowDefinitionId && { flowDefinitionId }),
    };

    log_info(`[${authContext.username}] is requesting step statistics.`, { filters }, correlationId);

    try {
        const response = await getStepStats(filters);
        return createApiGatewayResponse(200, buildSuccessResponse(response), correlationId);
    } catch (error: any) {
        log_error('Failed to generate step statistics', { error: error.message, stack: error.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal server error while fetching step statistics.', 'SERVER_ERROR'), correlationId);
    }
};

export const handler = withAdminAuth(mainHandler);
