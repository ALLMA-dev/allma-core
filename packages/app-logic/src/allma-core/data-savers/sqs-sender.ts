import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { z } from 'zod';
import { FlowRuntimeState, StepHandler, StepHandlerOutput, TransientStepError, StepDefinition } from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const sqsClient = new SQSClient({});

const SqsSenderInputSchema = z.object({
  payload: z.record(z.any(), { required_error: "SQS sender requires a 'payload' object in its input." }),
  queueUrl: z.string().url({ message: "SQS sender requires a valid 'queueUrl' in its input." }),
  messageGroupId: z.string().optional(),
  messageDeduplicationId: z.string().optional(),
});

/**
 * A generic data-saving module that sends a given payload to a specified SQS queue.
 * It now expects a fully rendered input object.
 *
 * @param stepInput The pre-rendered configuration object.
 * @param runtimeState The current flow runtime state for context and logging.
 * @returns A StepHandlerOutput containing the SQS MessageId on success.
 */
export const executeSqsSender: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  // The input is already merged and rendered by the dispatcher.
  const validationResult = SqsSenderInputSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/sqs-send module.", { 
        errors: validationResult.error.flatten(), 
        receivedInput: stepInput
    }, correlationId);
    throw new Error(`Invalid input for SQS sender: ${validationResult.error.message}`);
  }

  const { payload, queueUrl, messageGroupId, messageDeduplicationId } = validationResult.data;
  log_info(`Sending payload to SQS queue.`, { queueUrl }, correlationId);

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
    ...(messageGroupId && { MessageGroupId: messageGroupId }),
    ...(messageDeduplicationId && { MessageDeduplicationId: messageDeduplicationId }),
  });

  try {
    const result = await sqsClient.send(command);
    log_info(`Successfully sent message to SQS.`, { messageId: result.MessageId, command }, correlationId);
    return {
      outputData: {
        sqsMessageId: result.MessageId,
        _meta: { status: 'SUCCESS' },
      },
    };
  } catch (error: any) {
    log_error(`Failed to send message to SQS queue: ${queueUrl}`, { error: error.message }, correlationId);
    if (error.name === 'ServiceUnavailable' || error.name === 'ThrottlingException') {
      throw new TransientStepError(`SQS send failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};
