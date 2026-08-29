import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { AdminPermission, AdminRole } from '@allma/core-types';

const mockGetDashboardStats = vi.fn();

vi.mock('../../../src/allma-admin/services/dashboard-stats.service.js', () => ({
    getDashboardStats: () => mockGetDashboardStats(),
    DashboardStatsService: {
        getDashboardStats: () => mockGetDashboardStats(),
    },
}));

const { handler } = await import('../../../src/allma-admin/dashboard-stats.js');

const createEvent = (options: {
    groups?: string[];
    roles?: AdminRole[];
    permissions?: AdminPermission[];
    hasClaims?: boolean;
    requestId?: string;
} = {}): APIGatewayProxyEventV2WithJWTAuthorizer => {
    const hasClaims = options.hasClaims ?? true;
    const groups = options.groups ?? ['Admins'];
    const customAdminRoles = JSON.stringify({
        roles: options.roles ?? [AdminRole.FLOW_MANAGER],
        permissions: options.permissions ?? [AdminPermission.DASHBOARD_VIEW],
    });

    return {
        version: '2.0',
        routeKey: 'GET /admin/dashboard/stats',
        rawPath: '/admin/dashboard/stats',
        rawQueryString: '',
        headers: {},
        requestContext: {
            accountId: '123456789012',
            apiId: 'api-id',
            domainName: 'test.execute-api.us-east-1.amazonaws.com',
            domainPrefix: 'test',
            http: {
                method: 'GET',
                path: '/admin/dashboard/stats',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent',
            },
            requestId: options.requestId ?? 'req-dashboard-1',
            routeKey: 'GET /admin/dashboard/stats',
            stage: '$default',
            time: '01/Jan/2026:00:00:00 +0000',
            timeEpoch: 1704067200000,
            ...(hasClaims
                ? {
                      authorizer: {
                          jwt: {
                              claims: {
                                  sub: 'user-123',
                                  email: 'admin@example.com',
                                  'cognito:groups': groups,
                                  'custom:admin_roles': customAdminRoles,
                              },
                              scopes: [],
                          },
                      },
                  }
                : {}),
        },
        isBase64Encoded: false,
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
};

const invoke = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> =>
    (await handler(event, {} as never, (() => undefined) as never)) as APIGatewayProxyStructuredResultV2;

describe('dashboard-stats handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 with dashboard stats when caller has DASHBOARD_VIEW permission', async () => {
        const mockStats = {
            last24Hours: {
                totalExecutions: 5,
                statusBreakdown: { COMPLETED: 4, FAILED: 1, RUNNING: 0, TIMED_OUT: 0, CANCELLED: 0 },
                averageDurationMs: 1200,
            },
            last7Days: {
                totalExecutions: 20,
                statusBreakdown: { COMPLETED: 18, FAILED: 2, RUNNING: 0, TIMED_OUT: 0, CANCELLED: 0 },
                averageDurationMs: 1100,
            },
            recentFailures: [],
        };
        mockGetDashboardStats.mockResolvedValue(mockStats);

        const event = createEvent({
            permissions: [AdminPermission.DASHBOARD_VIEW],
        });

        const result = await invoke(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(mockStats);
        expect(mockGetDashboardStats).toHaveBeenCalledOnce();
    });

    it('returns 403 when caller lacks DASHBOARD_VIEW permission', async () => {
        const event = createEvent({
            roles: [],
            permissions: [AdminPermission.EXECUTIONS_READ],
        });

        const result = await invoke(event);

        expect(result.statusCode).toBe(403);
        const body = JSON.parse(result.body as string);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('FORBIDDEN');
        expect(mockGetDashboardStats).not.toHaveBeenCalled();
    });

    it('returns 403 when caller is not in the Admins Cognito group', async () => {
        const event = createEvent({
            groups: ['StandardUsers'],
            permissions: [AdminPermission.DASHBOARD_VIEW],
        });

        const result = await invoke(event);

        expect(result.statusCode).toBe(403);
        expect(mockGetDashboardStats).not.toHaveBeenCalled();
    });

    it('returns 401 when JWT claims are missing', async () => {
        const event = createEvent({ hasClaims: false });

        const result = await invoke(event);

        expect(result.statusCode).toBe(401);
        expect(mockGetDashboardStats).not.toHaveBeenCalled();
    });

    it('returns 500 when getDashboardStats throws an error', async () => {
        mockGetDashboardStats.mockRejectedValue(new Error('Internal DynamoDB query error'));

        const event = createEvent({
            permissions: [AdminPermission.DASHBOARD_VIEW],
        });

        const result = await invoke(event);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body as string);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('SERVER_ERROR');
    });
});
