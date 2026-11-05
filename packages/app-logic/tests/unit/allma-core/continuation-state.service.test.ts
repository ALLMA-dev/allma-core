import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from '../_helpers/aws-mock.js';

process.env.ALLMA_CONTINUATION_TABLE_NAME = 'test-continuation-table';

const { ContinuationStateService, ContinuationOwnershipMismatchError } = await import(
  '../../../src/allma-core/continuation-state.service.js'
);

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
    it('atomically deletes and returns the continuation record (system bypass, no principal)', async () => {
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
      // The system bypass deletes unconditionally — no ownership condition.
      const input = ddbMock.commandCalls(DeleteCommand)[0].args[0].input;
      expect(input.TableName).toBe('test-continuation-table');
      expect(input.Key).toEqual({ correlationKey: 'corr-123' });
      expect(input.ReturnValues).toBe('ALL_OLD');
      expect(input.ConditionExpression).toBeUndefined();
    });

    it('returns null when no record exists for the correlation key', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      const result = await ContinuationStateService.consumeContinuationRecord('corr-missing');

      expect(result).toBeNull();
    });

    it('enforces ownership atomically when a caller principal is supplied', async () => {
      const record = { correlationKey: 'corr-1', taskToken: 'tok', flowExecutionId: 'exec', ownerPrincipal: 'webhook-secret:a' };
      ddbMock.on(DeleteCommand).resolves({ Attributes: record });

      const result = await ContinuationStateService.consumeContinuationRecord('corr-1', 'webhook-secret:a');

      expect(result).toEqual(record);
      const input = ddbMock.commandCalls(DeleteCommand)[0].args[0].input;
      expect(input.ConditionExpression).toBe(
        'attribute_not_exists(ownerPrincipal) OR ownerPrincipal = :callerPrincipal',
      );
      expect(input.ExpressionAttributeValues).toEqual({ ':callerPrincipal': 'webhook-secret:a' });
      expect(input.ReturnValuesOnConditionCheckFailure).toBe('ALL_OLD');
    });

    it('throws ContinuationOwnershipMismatchError (and leaves the record) when another principal owns the key', async () => {
      const err: any = new Error('conditional check failed');
      err.name = 'ConditionalCheckFailedException';
      err.Item = { correlationKey: 'corr-1', ownerPrincipal: 'webhook-secret:other' };
      ddbMock.on(DeleteCommand).rejects(err);

      await expect(
        ContinuationStateService.consumeContinuationRecord('corr-1', 'webhook-secret:me'),
      ).rejects.toBeInstanceOf(ContinuationOwnershipMismatchError);
    });

    it('returns null (404) when the conditional delete fails with no Item — the key does not exist', async () => {
      const err: any = new Error('conditional check failed');
      err.name = 'ConditionalCheckFailedException';
      ddbMock.on(DeleteCommand).rejects(err);

      const result = await ContinuationStateService.consumeContinuationRecord('corr-missing', 'webhook-secret:me');
      expect(result).toBeNull();
    });

    it('throws when ALLMA_CONTINUATION_TABLE_NAME is not set', async () => {
      delete process.env.ALLMA_CONTINUATION_TABLE_NAME;

      await expect(
        ContinuationStateService.consumeContinuationRecord('corr-123'),
      ).rejects.toThrow('Missing required environment variable: ALLMA_CONTINUATION_TABLE_NAME');
    });

    it('propagates unexpected DynamoDB errors', async () => {
      ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB unavailable'));

      await expect(
        ContinuationStateService.consumeContinuationRecord('corr-123'),
      ).rejects.toThrow('DynamoDB unavailable');
    });
  });
});
