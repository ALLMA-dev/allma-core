import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  ITEM_TYPE_ALLMA_STEP_DEFINITION,
  ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
  StepType,
  ExternalStepRegistryItem,
} from '@allma/core-types';
import { mockClient } from '../_helpers/aws-mock.js';

process.env.ALLMA_CONFIG_TABLE_NAME = 'test-config-table';

const { StepDefinitionService } = await import('../../../src/allma-admin/services/step-definition.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);

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
  ddbMock.reset();
  process.env.ALLMA_CONFIG_TABLE_NAME = 'test-config-table';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StepDefinitionService', () => {
  describe('listExternalSteps', () => {
    it('queries GSI_ItemType_Id for external step registry items', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockExternalStep],
      });

      const results = await StepDefinitionService.listExternalSteps();

      expect(results).toEqual([mockExternalStep]);
      expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: 'test-config-table',
        IndexName: 'GSI_ItemType_Id',
        KeyConditionExpression: 'itemType = :itemType',
        ExpressionAttributeValues: {
          ':itemType': ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
        },
      });
    });

    it('returns empty array when no external steps exist', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const results = await StepDefinitionService.listExternalSteps();
      expect(results).toEqual([]);
    });

    it('throws error when ALLMA_CONFIG_TABLE_NAME is not set', async () => {
      delete process.env.ALLMA_CONFIG_TABLE_NAME;

      await expect(StepDefinitionService.listExternalSteps()).rejects.toThrow(
        'Missing required environment variable: ALLMA_CONFIG_TABLE_NAME',
      );
    });
  });

  describe('CRUD operations', () => {
    it('creates a user step definition with usr- id prefix', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await StepDefinitionService.create({
        name: 'My Custom Step',
        stepType: StepType.NO_OP,
        description: 'Test step',
      });

      expect(result.id).toMatch(/^usr-[a-f0-9-]+$/);
      expect(result.name).toBe('My Custom Step');
      expect(result.stepType).toBe(StepType.NO_OP);
      expect(result.version).toBe(1);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
        TableName: 'test-config-table',
        Item: expect.objectContaining({
          PK: `STEP_DEF#${result.id}`,
          SK: 'METADATA',
          itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
          name: 'My Custom Step',
        }),
      });
    });

    it('lists user step definitions', async () => {
      const storedStep = {
        PK: 'STEP_DEF#usr-1',
        SK: 'METADATA',
        itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
        id: 'usr-1',
        name: 'Step 1',
        stepType: StepType.NO_OP,
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      ddbMock.on(QueryCommand).resolves({ Items: [storedStep] });

      const results = await StepDefinitionService.list();
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('usr-1');
    });

    it('gets a user step definition by id', async () => {
      const storedStep = {
        PK: 'STEP_DEF#usr-1',
        SK: 'METADATA',
        itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
        id: 'usr-1',
        name: 'Step 1',
        stepType: StepType.NO_OP,
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      ddbMock.on(GetCommand).resolves({ Item: storedStep });

      const result = await StepDefinitionService.get('usr-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('usr-1');
      expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: 'test-config-table',
        Key: { PK: 'STEP_DEF#usr-1', SK: 'METADATA' },
      });
    });

    it('updates an existing step definition', async () => {
      const existingStep = {
        PK: 'STEP_DEF#usr-1',
        SK: 'METADATA',
        itemType: ITEM_TYPE_ALLMA_STEP_DEFINITION,
        id: 'usr-1',
        name: 'Step 1',
        stepType: StepType.NO_OP,
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      ddbMock.on(GetCommand).resolves({ Item: existingStep });
      ddbMock.on(PutCommand).resolves({});

      const updated = await StepDefinitionService.update('usr-1', {
        name: 'Updated Step Name',
      });

      expect(updated.name).toBe('Updated Step Name');
      expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
        TableName: 'test-config-table',
        Item: expect.objectContaining({
          PK: 'STEP_DEF#usr-1',
          SK: 'METADATA',
          name: 'Updated Step Name',
        }),
      });
    });

    it('deletes a step definition by id', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await StepDefinitionService.delete('usr-1');

      expect(ddbMock).toHaveReceivedCommandWith(DeleteCommand, {
        TableName: 'test-config-table',
        Key: { PK: 'STEP_DEF#usr-1', SK: 'METADATA' },
      });
    });
  });
});
