import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand, DynamoDBDocumentClient, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

/**
 * Creates a new RFQ entity in a DRAFT state.
 * This is triggered by actions like "Start RFQ" from the project dashboard.
 * It atomically creates the RFQ metadata and updates the status of the associated BOM parts.
 *
 * @param projectId The ID of the parent project.
 * @param payload The data for the new RFQ, including the initial list of parts.
 * @param userId The ID of the user creating the RFQ.
 * @returns An object containing the newly generated rfqId.
 */
export async function createRfq(
  projectId: string,
  payload: Partial<RFQ>,
  userId: string
): Promise<{ rfqId: string }> {
  if (!ENTITY_GRAPH_TABLE) {
    log_error('Server configuration error: ENTITY_GRAPH_TABLE not set.');
    throw new Error('Server configuration error.');
  }

  const rfqId = `RFQ-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
  const now = new Date().toISOString();
  log_info('Creating new RFQ draft', { projectId, userId, rfqId, parts: payload.parts });

  // 1. Prepare the RFQ metadata item
  const rfqItem: RFQ = {
    parts: [],
    volumeScenarios: [],
    commodity: '',
    suppliers: [],
    requirements: {
      material: true, process: true, tooling: true, logistics: true, terms: true, capacity: true,
    },
    responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    languagePreference: 'English',
    ...payload,
    PK: `RFQ#${rfqId}`,
    SK: 'METADATA',
    entityType: 'RFQ',
    rfqId,
    projectId,
    ownerId: userId,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    version: 1,
    // Add GSI keys for querying by project
    GSI1PK: `PROJECT#${projectId}`,
    GSI1SK: `RFQ#${rfqId}`,
  };

  // 2. Prepare the transaction
  const transactionItems: TransactWriteCommandInput['TransactItems'] = [{
    Put: {
      TableName: ENTITY_GRAPH_TABLE,
      Item: rfqItem,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    },
  }];

  // 3. Add Update operations for each part to link them to the new RFQ
  if (payload.parts && payload.parts.length > 0) {
    for (const partName of payload.parts) {
      transactionItems.push({
        Update: {
          TableName: ENTITY_GRAPH_TABLE,
          Key: { PK: `PROJECT#${projectId}`, SK: `BOM_PART#${partName}` },
          UpdateExpression: 'SET #rfqStatus = :status, #rfqId = :rfqId',
          ConditionExpression: 'attribute_exists(PK) AND (#rfqStatus = :notStarted OR attribute_not_exists(#rfqStatus))',
          ExpressionAttributeNames: { '#rfqStatus': 'rfqStatus', '#rfqId': 'rfqId' },
          ExpressionAttributeValues: { ':status': 'IN_PROGRESS', ':rfqId': rfqId, ':notStarted': 'NOT_STARTED' },
        },
      });
    }
  }

  // 4. Execute transaction
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactionItems }));
    log_info('Successfully created RFQ draft and updated parts atomically', { rfqId });
    return { rfqId };
  } catch (error) {
    log_error('Failed to create RFQ draft in transaction', { rfqId, error });
    if ((error as any).name === 'TransactionCanceledException') {
      const cancellationReasons = (error as any).CancellationReasons || [];
      const partConflict = cancellationReasons.some((r: any) => r.Code === 'ConditionalCheckFailed');
      if (partConflict) {
        throw new Error('One or more selected parts are already part of another RFQ.');
      }
      throw new Error('RFQ ID conflict or part not found. Please try again.');
    }
    throw new Error('An error occurred while creating the RFQ.');
  }
}