import { handler } from './create-project-draft.step';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
}));

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('create-project-draft handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    // Set the required environment variable for the test environment.
    process.env.ENTITY_GRAPH_TABLE = 'TestTable';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ENTITY_GRAPH_TABLE;
  });

  it('should send a correct PutCommand to DynamoDB', async () => {
    const event = {
      stepInput: {
        projectData: { projectName: 'Test Project', customerName: 'Test Customer' },
        partsCount: 15,
        initialContext: { projectId: 'PRJ-2025-001', bomFileName: 'bom.xlsx', userId: 'user-123' },
        correlationId: 'test-id',
      },
    };

    ddbMock.on(PutCommand).resolves({});

    await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'TestTable',
      Item: expect.objectContaining({
        PK: 'PROJECT#PRJ-2025-001',
        SK: 'METADATA',
        entityType: 'PROJECT',
        ownerId: 'user-123',
        status: 'DRAFT_AWAITING_REVIEW',
        projectName: 'Test Project',
        customerName: 'Test Customer',
        stats_totalPartsCount: 15,
        stats_existingPartsCount: 0,
        stats_newPartsCount: 0,
      }),
    });
  });
});