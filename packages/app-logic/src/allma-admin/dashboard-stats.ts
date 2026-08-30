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
import { getDashboardStats } from './services/dashboard-stats.service.js';

const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;

    if (!authContext.hasPermission(AdminPermission.DASHBOARD_VIEW)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
    }

    log_info(`[${authContext.username}] is requesting dashboard stats.`, {}, correlationId);

    try {
        const response = await getDashboardStats();
        return createApiGatewayResponse(200, buildSuccessResponse(response), correlationId);
    } catch (error: any) {
        log_error('Failed to generate dashboard stats', { error: error.message, stack: error.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal server error while fetching dashboard data.', 'SERVER_ERROR'), correlationId);
    }
};

export const handler = withAdminAuth(mainHandler);
