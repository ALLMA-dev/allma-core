import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StepType,
  AdminPermission,
  SYSTEM_STEP_DEFINITIONS,
  ExternalStepRegistryItem,
  ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
  StepDefinition,
} from '@allma/core-types';
import { StepDefinitionService } from '../../../src/allma-admin/services/step-definition.service.js';
import { handler } from '../../../src/allma-admin/step-management.js';

function createMockEvent(options: {
  method: string;
  path: string;
  rawPath?: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
  pathParameters?: Record<string, string>;
  groups?: string[];
  roles?: string[];
  permissions?: AdminPermission[];
}) {
  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.rawPath || options.path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: options.queryStringParameters,
    pathParameters: options.pathParameters,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: options.method,
        path: options.rawPath || options.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: `${options.method} ${options.path}`,
      stage: 'test',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1767225600000,
      authorizer: {
        jwt: {
          claims: {
            sub: 'user-123',
            email: 'admin@example.com',
            'cognito:groups': options.groups || ['Admins'],
            'custom:admin_roles': JSON.stringify({
              roles: options.roles || ['SUPER_ADMIN'],
              permissions: options.permissions || [],
            }),
          },
          scopes: [],
        },
      },
    },
    body: options.body,
    isBase64Encoded: false,
  } as any;
}

const mockUserStep: StepDefinition = {
  id: 'usr-custom-step-1',
  name: 'Custom Step 1',
  description: 'A custom step',
  stepType: StepType.NO_OP,
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockExternalStep: ExternalStepRegistryItem = {
  PK: 'EXTERNAL_STEP#custom-crawler',
  SK: 'METADATA',
  itemType: ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
  moduleIdentifier: 'custom-crawler',
  lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:custom-crawler',
  displayName: 'Custom Crawler',
  description: 'Crawls external web pages',
  stepType: StepType.DATA_LOAD,
  defaultConfig: { url: 'https://example.com' },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('step-management handler', () => {
  describe('listAggregatedStepDefinitions delegation', () => {
    it('aggregates user, external, and system steps by default', async () => {
      const listUserSpy = vi.spyOn(StepDefinitionService, 'list').mockResolvedValue([mockUserStep]);
      const listExternalSpy = vi.spyOn(StepDefinitionService, 'listExternalSteps').mockResolvedValue([mockExternalStep]);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      const items = body.data;
      expect(listUserSpy).toHaveBeenCalledTimes(1);
      expect(listExternalSpy).toHaveBeenCalledTimes(1);

      // Verify user steps are present
      const userStep = items.find((s: any) => s.id === 'usr-custom-step-1');
      expect(userStep).toBeDefined();
      expect(userStep.source).toBe('user');

      // Verify external steps are present and mapped
      const extStep = items.find((s: any) => s.id === 'custom-crawler');
      expect(extStep).toBeDefined();
      expect(extStep.source).toBe('external');
      expect(extStep.name).toBe('Custom Crawler');
      expect(extStep.defaultConfig).toEqual({ url: 'https://example.com' });

      // Verify system steps are present
      const sysSteps = items.filter((s: any) => s.source === 'system');
      expect(sysSteps.length).toBe(SYSTEM_STEP_DEFINITIONS.length);
    });

    it('filters only user steps when source=user is requested', async () => {
      const listUserSpy = vi.spyOn(StepDefinitionService, 'list').mockResolvedValue([mockUserStep]);
      const listExternalSpy = vi.spyOn(StepDefinitionService, 'listExternalSteps').mockResolvedValue([mockExternalStep]);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
        queryStringParameters: { source: 'user' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(listUserSpy).toHaveBeenCalledTimes(1);
      expect(listExternalSpy).not.toHaveBeenCalled();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].source).toBe('user');
      expect(body.data[0].id).toBe('usr-custom-step-1');
    });

    it('filters only external steps when source=external is requested', async () => {
      const listUserSpy = vi.spyOn(StepDefinitionService, 'list').mockResolvedValue([mockUserStep]);
      const listExternalSpy = vi.spyOn(StepDefinitionService, 'listExternalSteps').mockResolvedValue([mockExternalStep]);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
        queryStringParameters: { source: 'external' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(listUserSpy).not.toHaveBeenCalled();
      expect(listExternalSpy).toHaveBeenCalledTimes(1);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].source).toBe('external');
      expect(body.data[0].id).toBe('custom-crawler');
      expect(body.data[0].moduleIdentifier).toBe('custom-crawler');
    });

    it('filters only system steps when source=system is requested', async () => {
      const listUserSpy = vi.spyOn(StepDefinitionService, 'list').mockResolvedValue([mockUserStep]);
      const listExternalSpy = vi.spyOn(StepDefinitionService, 'listExternalSteps').mockResolvedValue([mockExternalStep]);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
        queryStringParameters: { source: 'system' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(listUserSpy).not.toHaveBeenCalled();
      expect(listExternalSpy).not.toHaveBeenCalled();

      expect(body.data.length).toBe(SYSTEM_STEP_DEFINITIONS.length);
      expect(body.data.every((s: any) => s.source === 'system')).toBe(true);
    });

    it('filters user and external steps when source=user,external is requested', async () => {
      const listUserSpy = vi.spyOn(StepDefinitionService, 'list').mockResolvedValue([mockUserStep]);
      const listExternalSpy = vi.spyOn(StepDefinitionService, 'listExternalSteps').mockResolvedValue([mockExternalStep]);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
        queryStringParameters: { source: 'user,external' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(listUserSpy).toHaveBeenCalledTimes(1);
      expect(listExternalSpy).toHaveBeenCalledTimes(1);

      expect(body.data).toHaveLength(2);
      expect(body.data.map((s: any) => s.source).sort()).toEqual(['external', 'user']);
    });
  });

  describe('CRUD delegation to StepDefinitionService', () => {
    it('delegates GET /allma/step-definitions/{id} to StepDefinitionService.get', async () => {
      const getSpy = vi.spyOn(StepDefinitionService, 'get').mockResolvedValue(mockUserStep);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions/{stepDefinitionId}',
        rawPath: '/allma/step-definitions/usr-custom-step-1',
        pathParameters: { stepDefinitionId: 'usr-custom-step-1' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('usr-custom-step-1');
      expect(getSpy).toHaveBeenCalledWith('usr-custom-step-1');
    });

    it('returns 404 when step definition is not found', async () => {
      vi.spyOn(StepDefinitionService, 'get').mockResolvedValue(null);

      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions/{stepDefinitionId}',
        rawPath: '/allma/step-definitions/non-existent',
        pathParameters: { stepDefinitionId: 'non-existent' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(404);
    });

    it('delegates POST /allma/step-definitions to StepDefinitionService.create', async () => {
      const createSpy = vi.spyOn(StepDefinitionService, 'create').mockResolvedValue(mockUserStep);

      const event = createMockEvent({
        method: 'POST',
        path: '/allma/step-definitions',
        body: JSON.stringify({
          name: 'Custom Step 1',
          stepType: StepType.NO_OP,
          description: 'A custom step',
        }),
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Step 1',
          stepType: StepType.NO_OP,
        }),
      );
    });

    it('delegates PUT /allma/step-definitions/{id} to StepDefinitionService.update', async () => {
      const updateSpy = vi.spyOn(StepDefinitionService, 'update').mockResolvedValue({
        ...mockUserStep,
        name: 'Updated Step Name',
      });

      const event = createMockEvent({
        method: 'PUT',
        path: '/allma/step-definitions/{stepDefinitionId}',
        rawPath: '/allma/step-definitions/usr-custom-step-1',
        pathParameters: { stepDefinitionId: 'usr-custom-step-1' },
        body: JSON.stringify({
          name: 'Updated Step Name',
          stepType: StepType.NO_OP,
        }),
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Step Name');
      expect(updateSpy).toHaveBeenCalledWith(
        'usr-custom-step-1',
        expect.objectContaining({
          name: 'Updated Step Name',
        }),
      );
    });

    it('delegates DELETE /allma/step-definitions/{id} to StepDefinitionService.delete', async () => {
      const deleteSpy = vi.spyOn(StepDefinitionService, 'delete').mockResolvedValue();

      const event = createMockEvent({
        method: 'DELETE',
        path: '/allma/step-definitions/{stepDefinitionId}',
        rawPath: '/allma/step-definitions/usr-custom-step-1',
        pathParameters: { stepDefinitionId: 'usr-custom-step-1' },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(204);
      expect(deleteSpy).toHaveBeenCalledWith('usr-custom-step-1');
    });
  });

  describe('Authorization checks', () => {
    it('returns 401 when token/claims are missing', async () => {
      const event = {
        version: '2.0',
        routeKey: 'GET /allma/step-definitions',
        rawPath: '/allma/step-definitions',
        rawQueryString: '',
        headers: {},
        requestContext: {
          requestId: 'test-req',
          http: { method: 'GET', path: '/allma/step-definitions' },
          authorizer: {},
        },
      } as any;

      const response = await handler(event);
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 when user is not in the required group', async () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/allma/step-definitions',
        groups: ['OtherGroup'],
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(403);
    });
  });
});
