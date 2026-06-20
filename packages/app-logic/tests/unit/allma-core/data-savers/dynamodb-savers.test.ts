import { describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { TransientStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';
import { executeDynamoDBUpdate } from '../../../../src/allma-core/data-savers/dynamodb-update-item.js';
import { executeDynamoDBQueryAndUpdate } from '../../../../src/allma-core/data-savers/dynamodb-query-and-update.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('executeDynamoDBUpdate', () => {
  beforeEach(() => resetAwsClientMocks(ddbMock));

  it('updates an item and returns the new attributes plus the request params', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'DONE' } });

    const result = await executeDynamoDBUpdate(
      {} as never,
      {
        tableName: 'Jobs',
        key: { id: 'j1' },
        updateExpression: 'SET #s = :s',
        expressionAttributeNames: { '#s': 'status' },
        expressionAttributeValues: { ':s': 'DONE' },
      },
      makeRuntimeState()
    );

    expect(result.outputData!.updatedAttributes).toEqual({ status: 'DONE' });
    expect(result.outputData!._meta).toMatchObject({ status: 'SUCCESS', dynamodb_params: { TableName: 'Jobs' } });
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, { TableName: 'Jobs', ReturnValues: 'UPDATED_NEW' });
  });

  it('maps a throttling error to a TransientStepError', async () => {
    ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('throttled'), { name: 'ProvisionedThroughputExceededException' }));

    await expect(
      executeDynamoDBUpdate(
        {} as never,
        { tableName: 'Jobs', key: { id: 'j1' }, updateExpression: 'SET a = :a' },
        makeRuntimeState()
      )
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input that is missing required fields', async () => {
    await expect(
      executeDynamoDBUpdate({} as never, { tableName: 'Jobs' }, makeRuntimeState())
    ).rejects.toThrow('Invalid input for dynamodb-update-item');
  });
});

describe('executeDynamoDBQueryAndUpdate', () => {
  beforeEach(() => resetAwsClientMocks(ddbMock));

  const config = {
    query: {
      tableName: 'Jobs',
      keyAttributes: ['id'],
      keyConditionExpression: 'gsiPk = :pk',
      expressionAttributeValues: { ':pk': 'PENDING' },
    },
    update: { updateExpression: 'SET #s = :claimed', expressionAttributeValues: { ':claimed': 'CLAIMED' } },
  };

  it('claims each queried item via a conditional update and counts the successes', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ id: 'a' }, { id: 'b' }] });
    ddbMock.on(UpdateCommand).resolves({ Attributes: { id: 'a', status: 'CLAIMED' } });

    const result = await executeDynamoDBQueryAndUpdate(config as never, config, makeRuntimeState());

    expect(result.outputData!.updatedItemCount).toBe(2);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
  });

  it('returns an empty result when the query finds no candidates', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await executeDynamoDBQueryAndUpdate(config as never, config, makeRuntimeState());

    expect(result.outputData).toEqual({ updatedItemCount: 0, items: [] });
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('treats a ConditionalCheckFailed update as a lost race, not a failure', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ id: 'a' }] });
    ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('claimed'), { name: 'ConditionalCheckFailedException' }));

    const result = await executeDynamoDBQueryAndUpdate(config as never, config, makeRuntimeState());

    expect(result.outputData!.updatedItemCount).toBe(0);
  });

  it('falls back to DescribeTable when keyAttributes are not supplied', async () => {
    const noKeyAttrsConfig = {
      query: {
        tableName: 'Jobs',
        keyConditionExpression: 'gsiPk = :pk',
        expressionAttributeValues: { ':pk': 'PENDING' },
      },
      update: config.update,
    };
    ddbMock.on(QueryCommand).resolves({ Items: [{ id: 'a', other: 1 }] });
    ddbMock.on(DescribeTableCommand).resolves({ Table: { KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }] } });
    ddbMock.on(UpdateCommand).resolves({ Attributes: { id: 'a' } });

    const result = await executeDynamoDBQueryAndUpdate(noKeyAttrsConfig as never, noKeyAttrsConfig, makeRuntimeState());

    expect(result.outputData!.updatedItemCount).toBe(1);
    expect(ddbMock).toHaveReceivedCommandTimes(DescribeTableCommand, 1);
  });

  it('rejects a structurally invalid configuration', async () => {
    await expect(
      executeDynamoDBQueryAndUpdate({} as never, { query: {} }, makeRuntimeState())
    ).rejects.toThrow('Invalid input for system/dynamodb-query-and-update module');
  });
});
