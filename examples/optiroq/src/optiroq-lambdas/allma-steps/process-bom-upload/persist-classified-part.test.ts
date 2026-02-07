import { handler } from './persist-classified-part.step';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
}));

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('persist-classified-part handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    // Set the required environment variable for the test environment.
    process.env.ENTITY_GRAPH_TABLE = 'TestTable';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ENTITY_GRAPH_TABLE;
  });

  const mockPart = { partName: 'Part-A', material: 'Steel', quantity: 100 };
  const mockProjectId = 'PRJ-001';

  it('should persist a part as EXISTING if classification is a MATCH', async () => {
    const event = {
      stepInput: {
        part: mockPart,
        classificationResult: {
          matchStatus: 'MATCH' as const,
          confidenceScore: 0.98,
          matchedContractId: 'CTR-123',
          reasoning: 'Exact match',
        },
        projectId: mockProjectId,
        correlationId: 'test-id',
      },
    };

    ddbMock.on(PutCommand).resolves({});
    await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'TestTable',
      Item: expect.objectContaining({
        PK: `PROJECT#${mockProjectId}`,
        SK: `BOM_PART#${mockPart.partName}`,
        partStatus: 'EXISTING',
        classificationConfidence: 0.98,
        existingPartDetails: { contractId: 'CTR-123', currentPrice: undefined, currentSupplier: undefined },
      }),
    });
  });

  it('should persist a part as NEW if classification is NO_MATCH', async () => {
    const event = {
      stepInput: {
        part: mockPart,
        classificationResult: {
          matchStatus: 'NO_MATCH' as const,
          confidenceScore: 0.95, // This is confidence in NO_MATCH
          matchedContractId: null,
          reasoning: 'No similar parts found',
        },
        projectId: mockProjectId,
        correlationId: 'test-id',
      },
    };

    ddbMock.on(PutCommand).resolves({});
    await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'TestTable',
      Item: expect.objectContaining({
        PK: `PROJECT#${mockProjectId}`,
        SK: `BOM_PART#${mockPart.partName}`,
        partStatus: 'NEW',
        classificationConfidence: 0.05, // Confidence in being NEW is 1.0 - 0.95
      }),
    });
  });
});