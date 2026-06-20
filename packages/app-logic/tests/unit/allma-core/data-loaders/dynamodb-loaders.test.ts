import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TransientStepError, PermanentStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// The manifest loader fails fast when item offloading is enabled without a traces bucket;
// clear the env before import so that branch is deterministic.
vi.hoisted(() => {
  delete process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME;
});

import { handleDynamoDBLoader } from '../../../../src/allma-core/data-loaders/dynamodb-loader.js';
import { handleDdbQueryToS3Manifest } from '../../../../src/allma-core/data-loaders/ddb-query-to-s3-manifest.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);

describe('handleDynamoDBLoader', () => {
  beforeEach(() => resetAwsClientMocks(ddbMock));

  it('returns the item for a GET operation', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: '1', name: 'Ada' } });

    const result = await handleDynamoDBLoader(
      {} as never,
      { operation: 'GET', tableName: 'Users', key: { id: '1' } },
      makeRuntimeState()
    );

    expect(result.outputData!.content).toEqual({ id: '1', name: 'Ada' });
    expect(result.outputData!._meta.dynamodb_params).toMatchObject({ TableName: 'Users' });
  });

  it('returns null content when GET finds no item', async () => {
    ddbMock.on(GetCommand).resolves({});

    const result = await handleDynamoDBLoader(
      {} as never,
      { operation: 'GET', tableName: 'Users', key: { id: 'missing' } },
      makeRuntimeState()
    );

    expect(result.outputData!.content).toBeNull();
  });

  it('returns the items array for a QUERY operation', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ id: '1' }, { id: '2' }] });

    const result = await handleDynamoDBLoader(
      {} as never,
      { operation: 'QUERY', tableName: 'Users', keyConditionExpression: 'id = :id', expressionAttributeValues: { ':id': '1' } },
      makeRuntimeState()
    );

    expect(result.outputData!.content).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns count metadata for a COUNT query', async () => {
    ddbMock.on(QueryCommand).resolves({ Count: 7, ScannedCount: 9 });

    const result = await handleDynamoDBLoader(
      {} as never,
      {
        operation: 'QUERY',
        tableName: 'Users',
        select: 'COUNT',
        keyConditionExpression: 'id = :id',
        expressionAttributeValues: { ':id': '1' },
      },
      makeRuntimeState()
    );

    expect(result.outputData!.content).toEqual({ Count: 7, ScannedCount: 9 });
  });

  it('returns the items array for a SCAN operation', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [{ id: 'x' }] });

    const result = await handleDynamoDBLoader(
      {} as never,
      { operation: 'SCAN', tableName: 'Users' },
      makeRuntimeState()
    );

    expect(result.outputData!.content).toEqual([{ id: 'x' }]);
  });

  it('maps a throttling error to a TransientStepError carrying the ddb params', async () => {
    ddbMock.on(GetCommand).rejects(Object.assign(new Error('throttled'), { name: 'ThrottlingException' }));

    await expect(
      handleDynamoDBLoader({} as never, { operation: 'GET', tableName: 'Users', key: { id: '1' } }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input with an unrecognized operation', async () => {
    await expect(
      handleDynamoDBLoader({} as never, { operation: 'DELETE', tableName: 'Users' }, makeRuntimeState())
    ).rejects.toThrow('Invalid stepInput for dynamodb-data-loader');
  });
});

describe('handleDdbQueryToS3Manifest', () => {
  beforeEach(() => resetAwsClientMocks(ddbMock, s3Mock));

  const baseConfig = {
    query: {
      tableName: 'Events',
      keyConditionExpression: 'pk = :pk',
      expressionAttributeValues: { ':pk': 'TENANT#1' },
    },
    destination: { bucketName: 'manifest-bucket', key: 'manifests/out.jsonl' },
  };

  it('paginates the query, writes a JSON-lines manifest to S3, and reports the item count', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ id: 1 }], LastEvaluatedKey: { pk: 'TENANT#1', sk: '1' } })
      .resolvesOnce({ Items: [{ id: 2 }] });
    s3Mock.on(PutObjectCommand).resolves({});

    const result = await handleDdbQueryToS3Manifest(baseConfig as never, baseConfig, makeRuntimeState());

    expect(result.outputData).toMatchObject({
      manifest: { bucket: 'manifest-bucket', key: 'manifests/out.jsonl' },
      itemCount: 2,
      itemsOffloaded: 0,
    });
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    const putBody = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.Body as string;
    expect(putBody).toBe(`${JSON.stringify({ id: 1 })}\n${JSON.stringify({ id: 2 })}\n`);
  });

  it('throws a PermanentStepError when offloading is enabled without a traces bucket', async () => {
    await expect(
      handleDdbQueryToS3Manifest(
        { ...baseConfig, enableItemOffloading: true } as never,
        { ...baseConfig, enableItemOffloading: true },
        makeRuntimeState()
      )
    ).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('rejects a structurally invalid configuration', async () => {
    await expect(
      handleDdbQueryToS3Manifest({} as never, { query: {} }, makeRuntimeState())
    ).rejects.toThrow('Invalid configuration for DDB to S3 Manifest step');
  });

  it('wraps a DynamoDB failure as a TransientStepError', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('ddb down'));

    await expect(
      handleDdbQueryToS3Manifest(baseConfig as never, baseConfig, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });
});
