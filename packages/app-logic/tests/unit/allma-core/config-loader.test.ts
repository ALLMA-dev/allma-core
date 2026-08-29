import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PermanentStepError, type McpConnection } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.ALLMA_CONFIG_TABLE_NAME = 'test-config-table';
});

import { loadMcpConnection } from '../../../src/allma-core/config-loader.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('loadMcpConnection', () => {
  beforeEach(() => {
    resetAwsClientMocks(ddbMock);
  });

  it('loads and validates an MCP connection successfully', async () => {
    const mockConnection: McpConnection = {
      id: 'conn-1',
      name: 'Production GitHub MCP',
      serverUrl: 'https://mcp.github.com/sse',
      authentication: {
        type: 'BEARER_TOKEN',
        secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:mcp-token',
        secretJsonKey: 'token',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand, {
      TableName: 'test-config-table',
      Key: { PK: 'MCP_CONNECTION#conn-1', SK: 'METADATA' },
    }).resolves({
      Item: {
        ...mockConnection,
        PK: 'MCP_CONNECTION#conn-1',
        SK: 'METADATA',
        itemType: 'ALLMA_MCP_CONNECTION',
      },
    });

    const result = await loadMcpConnection('conn-1', 'exec-123');

    expect(result).toEqual(mockConnection);
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'test-config-table',
      Key: { PK: 'MCP_CONNECTION#conn-1', SK: 'METADATA' },
    });
  });

  it('throws PermanentStepError when MCP connection is not found in DynamoDB', async () => {
    ddbMock.on(GetCommand, {
      TableName: 'test-config-table',
      Key: { PK: 'MCP_CONNECTION#nonexistent', SK: 'METADATA' },
    }).resolves({
      Item: undefined,
    });

    await expect(loadMcpConnection('nonexistent', 'exec-123')).rejects.toThrow(
      PermanentStepError
    );
    await expect(loadMcpConnection('nonexistent', 'exec-123')).rejects.toThrow(
      "MCP Connection not found for id: nonexistent"
    );
  });

  it('re-throws DynamoDB errors on failure', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB ServiceUnavailable'));

    await expect(loadMcpConnection('conn-1', 'exec-123')).rejects.toThrow(
      'DynamoDB ServiceUnavailable'
    );
  });

  it('throws error when item in DynamoDB fails schema validation', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: 'MCP_CONNECTION#invalid-conn',
        SK: 'METADATA',
        id: 'invalid-conn',
      },
    });

    await expect(loadMcpConnection('invalid-conn', 'exec-123')).rejects.toThrow();
  });
});
