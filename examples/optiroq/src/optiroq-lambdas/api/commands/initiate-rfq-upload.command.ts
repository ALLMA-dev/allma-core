import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';
import { randomUUID } from 'crypto';

const sqsClient = new SQSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { ENTITY_GRAPH_TABLE, ALLMA_START_QUEUE_URL } = process.env;
const FLOW_DEFINITION_ID = 'optiroq-process-rfq-upload';

interface InitiateRfqUploadPayload {
  s3Bucket: string;
  s3Key: string;
  fileName: string;
}

/**
 * Creates an RFQ draft in 'DRAFT_PROCESSING' status, then triggers the
 * Allma RFQ processing flow.
 *
 * @param projectId The ID of the parent project.
 * @param payload The S3 location of the uploaded file.
 * @param userId The ID of the user initiating the upload.
 * @param userEmail The user's email for notifications.
 * @returns An object with the new rfqId and flowExecutionId.
 */
export async function initiateRfqUpload(
  projectId: string,
  payload: InitiateRfqUploadPayload,
  userId: string,
  userEmail: string
): Promise<{ rfqId: string; flowExecutionId: string }> {
  if (!ENTITY_GRAPH_TABLE || !ALLMA_START_QUEUE_URL) {
    throw new Error('Server configuration error.');
  }

  const { s3Bucket, s3Key, fileName } = payload;
  if (!s3Bucket || !s3Key || !fileName) {
    throw new Error('Invalid payload: s3Bucket, s3Key, and fileName are required.');
  }

  const rfqId = `RFQ-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
  const flowExecutionId = `rfq-upload-${rfqId}`;
  const now = new Date().toISOString();

  const rfqItem: Partial<RFQ> = {
    PK: `RFQ#${rfqId}`,
    SK: 'METADATA',
    entityType: 'RFQ',
    rfqId,
    projectId,
    ownerId: userId,
    status: 'DRAFT_PROCESSING',
    createdAt: now,
    updatedAt: now,
    version: 1,
    uploadDetails: { fileName, s3Key, s3Bucket },
  };

  try {
    await docClient.send(new PutCommand({ TableName: ENTITY_GRAPH_TABLE, Item: rfqItem }));
    log_info('Created RFQ draft for file upload', { rfqId, projectId });
  } catch (error) {
    log_error('Failed to create RFQ draft for upload', { rfqId, error });
    throw new Error('Failed to initialize RFQ.');
  }

  const flowPayload = {
    flowDefinitionId: FLOW_DEFINITION_ID,
    initialContextData: { s3Bucket, s3Key, rfqId, projectId, userId, userEmail },
    correlationId: flowExecutionId,
  };

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: ALLMA_START_QUEUE_URL,
      MessageBody: JSON.stringify(flowPayload),
    }));
    log_info('Successfully triggered RFQ upload flow', { rfqId });
    return { rfqId, flowExecutionId };
  } catch (error) {
    log_error('Failed to trigger RFQ upload flow', { rfqId, error });

    // Compensating Transaction
    try {
      await docClient.send(new UpdateCommand({
        TableName: ENTITY_GRAPH_TABLE,
        Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'DRAFT_FAILED' },
      }));
    } catch (compensationError) {
      log_error('CRITICAL: Failed to execute compensating transaction for RFQ.', { rfqId, compensationError });
    }
    
    throw new Error('Failed to start file processing.');
  }
}