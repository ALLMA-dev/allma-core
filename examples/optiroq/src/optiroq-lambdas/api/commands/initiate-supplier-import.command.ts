import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { log_info, log_error } from '@allma/core-sdk';

const sqsClient = new SQSClient({});
const { ALLMA_START_QUEUE_URL } = process.env;
const FLOW_DEFINITION_ID = 'optiroq-process-supplier-import';

interface InitiateSupplierUploadPayload {
  s3Bucket: string;
  s3Key: string;
  fileName: string;
}

/**
 * Triggers the Allma supplier processing flow.
 *
 * @param payload The data sent from the client.
 * @param userId The ID of the user initiating the upload.
 * @param userEmail The email of the user, for notifications.
 * @returns An object containing the flowExecutionId.
 */
export async function initiateSupplierUpload(
  payload: InitiateSupplierUploadPayload,
  userId: string,
  userEmail: string
): Promise<{ flowExecutionId: string }> {
  if (!ALLMA_START_QUEUE_URL) {
    log_error('Server configuration error: Missing ALLMA_START_QUEUE_URL.');
    throw new Error('Server configuration error.');
  }

  const { s3Bucket, s3Key, fileName } = payload;
  if (!s3Bucket || !s3Key || !fileName) {
    throw new Error('Invalid payload: s3Bucket, s3Key, and fileName are required.');
  }

  const flowExecutionId = `supplier-import-${userId}-${new Date().getTime()}`;

  const flowPayload = {
    flowDefinitionId: FLOW_DEFINITION_ID,
    flowVersion: 'LATEST_PUBLISHED',
    initialContextData: {
      s3Bucket,
      s3Key,
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

    log_info('Successfully sent message to Allma start queue for supplier import', { userId, flowExecutionId });
    return { flowExecutionId };
  } catch (error) {
    log_error('Failed to send message to SQS for supplier upload flow', { userId, error });
    throw new Error('Failed to start file processing.');
  }
}