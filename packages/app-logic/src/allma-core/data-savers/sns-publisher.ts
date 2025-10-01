import { SNSClient, PublishCommand, MessageAttributeValue } from '@aws-sdk/client-sns';
import { z } from 'zod';
import { FlowRuntimeState, StepHandler, StepHandlerOutput, TransientStepError, StepDefinition } from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const snsClient = new SNSClient({});

const SnsPublisherInputSchema = z.object({
  payload: z.record(z.any(), { required_error: "SNS publisher requires a 'payload' object." }),
  topicArn: z.string().startsWith('arn:aws:sns:', { message: "SNS publisher requires a valid 'topicArn'." }),
  // Message attributes are crucial for filtering on the subscriber side.
  messageAttributes: z.record(z.object({
    DataType: z.string(),
    StringValue: z.string().optional(),
    BinaryValue: z.instanceof(Uint8Array).optional(),
  })).optional(),
});

/**
 * A generic data-saving module that publishes a payload to a specified SNS topic.
 */
export const executeSnsPublisher: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  const validationResult = SnsPublisherInputSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/sns-publish module.", { errors: validationResult.error.flatten() }, correlationId);
    throw new Error(`Invalid input for SNS publisher: ${validationResult.error.message}`);
  }

  const { payload, topicArn, messageAttributes } = validationResult.data;
  log_info(`Publishing payload to SNS topic.`, { topicArn, attributes: Object.keys(messageAttributes || {}) }, correlationId);

  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(payload),
    MessageAttributes: messageAttributes as Record<string, MessageAttributeValue>,
  });

  try {
    const result = await snsClient.send(command);
    log_info(`Successfully published message to SNS.`, { messageId: result.MessageId }, correlationId);
    return {
      outputData: {
        snsMessageId: result.MessageId,
        _meta: { status: 'SUCCESS' },
      },
    };
  } catch (error: any) {
    log_error(`Failed to publish message to SNS topic: ${topicArn}`, { error: error.message }, correlationId);
    if (error.name === 'ServiceUnavailable' || error.name === 'ThrottlingException' || error.name === 'InternalFailure') {
      throw new TransientStepError(`SNS publish failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};
