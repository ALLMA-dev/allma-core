import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from '../_helpers/aws-mock.js';

process.env.ALLMA_CONTINUATION_TABLE_NAME = 'test-continuation-table';

const { ContinuationStateService } = await import('../../../src/allma-core/continuation-state.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('ContinuationStateService', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.ALLMA_CONTINUATION_TABLE_NAME = 'test-continuation-table';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('consumeContinuationRecord', () => {
    it('atomically deletes and returns the continuation record', async () => {
      const record = {
        correlationKey: 'corr-123',
        taskToken: 'tok-abc',
        flowExecutionId: 'exec-xyz',
        stepInstanceId: 'step-1',
        createdAt: '2026-08-01T00:00:00.000Z',
        ttl: 1754092800,
      };

      ddbMock.on(DeleteCommand).resolves({ Attributes: record });

      const result = await ContinuationStateService.consumeContinuationRecord('corr-123');

      expect(result).toEqual(record);
      expect(ddbMock).toHaveReceivedCommandWith(DeleteCommand, {
        TableName: 'test-continuation-table',
        Key: { correlationKey: 'corr-123' },
        ReturnValues: 'ALL_OLD',
      });
    });

    it('returns null when no record exists for the correlation key', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      const result = await ContinuationStateService.consumeContinuationRecord('corr-missing');

      expect(result).toBeNull();
      expect(ddbMock).toHaveReceivedCommandWith(DeleteCommand, {
        TableName: 'test-continuation-table',
        Key: { correlationKey: 'corr-missing' },
        ReturnValues: 'ALL_OLD',
      });
    });

    it('throws when ALLMA_CONTINUATION_TABLE_NAME is not set', async () => {
      delete process.env.ALLMA_CONTINUATION_TABLE_NAME;

      await expect(
        ContinuationStateService.consumeContinuationRecord('corr-123'),
      ).rejects.toThrow('Missing required environment variable: ALLMA_CONTINUATION_TABLE_NAME');
    });

    it('propagates DynamoDB errors', async () => {
      ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB unavailable'));

      await expect(
        ContinuationStateService.consumeContinuationRecord('corr-123'),
      ).rejects.toThrow('DynamoDB unavailable');
    });
  });
});
