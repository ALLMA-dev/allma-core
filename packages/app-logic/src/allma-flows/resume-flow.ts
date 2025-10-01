import { z } from 'zod';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SFNClient, SendTaskSuccessCommand, TaskTimedOut, InvalidToken } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ENV_VAR_NAMES } from '@allma/core-types';
import {
  log_error,
  log_info,
  log_warn,
  createApiGatewayResponse,
  buildSuccessResponse,
  buildErrorResponse,
} from '@allma/core-sdk';

const sfnClient = new SFNClient({});
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONTINUATION_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME]!;

const MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT = 220 * 1024;
const MAX_CONTEXT_DATA_SIZE_BYTES = process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] 
    ? parseInt(process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] || '', 10) 
    : MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT;

// Zod schema for validating the incoming request body
const ResumeFlowInputSchema = z.object({
  correlationValue: z.string().min(1, 'correlationValue is required.'),
  payload: z.record(z.any()).optional().default({}),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const correlationId = event.requestContext.requestId;
  log_info('ResumeFlowLambda invoked', { event }, correlationId);

  // 1. Validate Input Body
  let parsedBody;
  try {
    const rawBody = event.body ? JSON.parse(event.body) : {};
    parsedBody = ResumeFlowInputSchema.parse(rawBody);
  } catch (error: any) {
    log_warn('Invalid request body for resume-flow', { error: error.message, body: event.body }, correlationId);
    return createApiGatewayResponse(400, buildErrorResponse('Invalid request body.', 'VALIDATION_ERROR', error.errors), correlationId);
  }
  const { correlationValue, payload } = parsedBody;
  log_info(`Attempting to resume flow for correlationValue: ${correlationValue}`, { payload }, correlationId);

  let taskToken: string;
  let flowExecutionId: string;

  try {
    // 2. Atomically delete the continuation record and retrieve its contents.
    // This is the most robust way to prevent replay attacks and race conditions.
    const deleteResult = await ddbDocClient.send(new DeleteCommand({
        TableName: CONTINUATION_TABLE_NAME,
        Key: {
            correlationKey: correlationValue,
        },
        // Ask DynamoDB to return the item's content as it was before the deletion.
        ReturnValues: 'ALL_OLD',
    }));

    // 3. Check if the record existed.
    if (!deleteResult.Attributes) {
        log_warn('No active waiting task found for the given correlation key. It may have already been resumed or timed out.', { correlationValue });
        return createApiGatewayResponse(404, buildErrorResponse('No active flow found waiting for this event.', 'NOT_FOUND'), correlationId);
    }

    // If we are here, the delete was successful.
    log_info('Successfully and atomically deleted continuation record to prevent replay.', { correlationValue }, correlationId);

    const continuationRecord = deleteResult.Attributes;
    taskToken = continuationRecord.taskToken;
    flowExecutionId = continuationRecord.flowExecutionId;

    if (!taskToken || !flowExecutionId) {
        log_error('Continuation record is malformed, missing taskToken or flowExecutionId.', { correlationValue, record: continuationRecord }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal Server Error: Corrupted continuation record.', 'SERVER_ERROR'), correlationId);
    }

    log_info('Found and consumed continuation record.', { correlationValue, flowExecutionId }, correlationId);
    
    // 4. Check payload size before attempting to send to Step Functions.
    const payloadString = JSON.stringify(payload);
    const payloadSize = Buffer.byteLength(payloadString, 'utf-8');

    if (payloadSize > MAX_CONTEXT_DATA_SIZE_BYTES) {
        log_error('Resume payload is too large for Step Functions.', { payloadSize, limit: MAX_CONTEXT_DATA_SIZE_BYTES }, correlationId);
        // It's a client error because the payload they sent is too large.
        return createApiGatewayResponse(413, buildErrorResponse(`Payload size of ${payloadSize} bytes exceeds the limit of ${MAX_CONTEXT_DATA_SIZE_BYTES} bytes.`, 'PAYLOAD_TOO_LARGE'), correlationId);
    }

    // 5. Resume the Step Function execution with the payload.
    const sfnClientResult = await sfnClient.send(new SendTaskSuccessCommand({
      taskToken: taskToken,
      output: payloadString, // The payload from the user's message
    }));

    log_info('Successfully sent SendTaskSuccess to Step Functions.', { flowExecutionId, sfnClientResult, payloadString }, correlationId);
    // Use 202 Accepted as the SFN resumption is asynchronous.
    return createApiGatewayResponse(202, buildSuccessResponse({ message: 'Flow resumption accepted.' }), correlationId);

  } catch (error: any) {
    // This block now primarily catches errors from the SFN call.
    if (error instanceof TaskTimedOut || error instanceof InvalidToken) {
      log_warn(`SFN task has timed out or the token is invalid. The flow cannot be resumed.`, { correlationValue, errorName: error.name }, correlationId);
      // 410 Gone is appropriate because the task token (and the DDB record) is no longer valid.
      return createApiGatewayResponse(410, buildErrorResponse('The flow waiting for this event has timed out or is no longer valid.', 'GONE'), correlationId);
    }

    log_error('Failed to resume flow due to an unexpected error.', { correlationValue, error: error.message, stack: error.stack }, correlationId);
    return createApiGatewayResponse(500, buildErrorResponse('Internal server error during flow resumption.', 'SERVER_ERROR'), correlationId);
  }
};