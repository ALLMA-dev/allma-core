// allma-core/examples/optiroq/src/optiroq-lambdas/api/commands/initiate-bom-upload.command.ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, UpdateCommand, DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, SystemSettings } from '@optiroq/types';
import { randomUUID } from 'crypto';

const sqsClient = new SQSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { ENTITY_GRAPH_TABLE, ALLMA_START_QUEUE_URL } = process.env;
const FLOW_DEFINITION_ID = 'optiroq-process-bom-upload';

interface InitiateBomUploadPayload {
  s3Bucket: string;
  s3Key: string;
  fileName: string;
}

// Cached settings to reduce DynamoDB calls within a single invocation
let systemSettings: SystemSettings | null = null;
async function getSystemSettings(): Promise<SystemSettings> {
  if (systemSettings) return systemSettings;
  if (!ENTITY_GRAPH_TABLE) throw new Error('ENTITY_GRAPH_TABLE not set.');
  const { Item } = await docClient.send(new GetCommand({ TableName: ENTITY_GRAPH_TABLE, Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' } }));
  if (!Item) throw new Error('System settings for base units not found.');
  systemSettings = Item as SystemSettings;
  return systemSettings;
}

/**
 * Creates a project draft in 'DRAFT_PROCESSING' status, then triggers the
 * Allma BOM processing flow by sending a message to the SQS start queue.
 * Includes compensating logic to handle failures in triggering the flow.
 *
 * @param payload The data sent from the client.
 * @param userId The ID of the user initiating the upload.
 * @param userEmail The email of the user, for notifications.
 * @returns An object containing the newly generated projectId and flowExecutionId.
 */
export async function initiateBomUpload(
  payload: InitiateBomUploadPayload,
  userId: string,
  userEmail: string
): Promise<{ projectId: string; flowExecutionId: string }> {
  if (!ENTITY_GRAPH_TABLE || !ALLMA_START_QUEUE_URL) {
    log_error('Server configuration error: Missing environment variables.');
    throw new Error('Server configuration error.');
  }

  const { s3Bucket, s3Key, fileName } = payload;
  if (!s3Bucket || !s3Key || !fileName) {
    throw new Error('Invalid payload: s3Bucket, s3Key, and fileName are required.');
  }
  
  // Fetch system settings to apply defaults immediately
  const settings = await getSystemSettings();

  // 1. Create Project Draft immediately for UI feedback
  const projectId = `PRJ-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
  const flowExecutionId = `bom-upload-${projectId}`;
  const now = new Date().toISOString();

  const projectItem: Project = {
    PK: `PROJECT#${projectId}`,
    SK: 'METADATA',
    entityType: 'PROJECT',
    projectId,
    ownerId: userId,
    // MODIFIED: Use static GSI PK for system-wide listing
    GSI1PK: 'PROJECTS',
    GSI1SK: now,
    status: 'DRAFT_PROCESSING',
    methodUsed: 'upload',
    bomFileName: payload.fileName,
    createdAt: now,
    lastModified: now,
    bomProcessingFlowId: flowExecutionId,
    bomProcessingStartedAt: now,
    // Apply system defaults immediately upon creation
    defaultCurrency: settings.baseCurrency,
    defaultWeightUnit: settings.baseWeight,
    defaultLengthUnit: settings.baseLength,
    defaultVolumeUnit: settings.baseVolume,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: ENTITY_GRAPH_TABLE,
      Item: projectItem,
    }));
    log_info('Created project draft for BOM upload with default units', { projectId, userId });
  } catch (error) {
    log_error('Failed to create project draft in DynamoDB', { projectId, error });
    throw new Error('Failed to initialize project.');
  }

  // 2. Trigger Allma Flow for asynchronous processing
  const flowPayload = {
    flowDefinitionId: FLOW_DEFINITION_ID,
    flowVersion: 'LATEST_PUBLISHED',
    initialContextData: {
      s3Bucket,
      s3Key,
      bomFileName: fileName,
      projectId,
      userId,
      userEmail,
    },
    correlationId: flowExecutionId,
  };

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: ALLMA_START_QUEUE_URL,
      MessageBody: JSON.stringify(flowPayload),
    }));

    log_info('Successfully sent message to Allma start queue', { projectId, flowExecutionId });
    return { projectId, flowExecutionId };
  } catch (error) {
    log_error('Failed to send message to SQS for BOM upload flow', { projectId, error });

    // --- COMPENSATING TRANSACTION ---
    // The project was created but the flow trigger failed. We must update the
    // project status to 'DRAFT_FAILED' to prevent it from being stuck in 'DRAFT_PROCESSING'.
    log_info('Performing compensating transaction: setting project status to DRAFT_FAILED', { projectId });
    try {
      await docClient.send(new UpdateCommand({
        TableName: ENTITY_GRAPH_TABLE,
        Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #status = :status, #lastModified = :now REMOVE bomProcessingFlowId, bomProcessingStartedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#lastModified': 'lastModified',
        },
        ExpressionAttributeValues: {
          ':status': 'DRAFT_FAILED',
          ':now': new Date().toISOString(),
        },
      }));
      log_info('Successfully executed compensating transaction.', { projectId });
    } catch (compensationError) {
      // If the compensation itself fails, this is a critical state that requires manual intervention.
      log_error('CRITICAL: Failed to execute compensating transaction for project.', {
        projectId,
        originalError: error,
        compensationError,
      });
    }
    
    // Re-throw the original error to ensure the client receives a failure response.
    throw new Error('Failed to start file processing.');
  }
}