// packages/allma-app-logic/src/allma-core/data-loaders/sqs-receive-messages.ts
import { SQSClient, ReceiveMessageCommand, DeleteMessageBatchCommand } from '@aws-sdk/client-sqs';
import { z } from 'zod';
import {
    FlowRuntimeState,
    StepHandler,
    StepHandlerOutput,
    TransientStepError,
    StepDefinition
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const sqsClient = new SQSClient({});

const SqsReceiveConfigSchema = z.object({
    queueUrl: z.string().url(),
    maxNumberOfMessages: z.coerce.number().int().min(1).max(10).optional().default(10),
    waitTimeSeconds: z.coerce.number().int().min(0).max(20).optional().default(0),
    deleteMessages: z.boolean().optional().default(true),
});

/**
 * A standard StepHandler for receiving messages from an SQS queue.
 * It now expects a pre-rendered configuration.
 */
export const handleSqsReceiveMessages: StepHandler = async (
    stepDefinition: StepDefinition,
    stepInput: Record<string, any>,
    runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
    const correlationId = runtimeState.flowExecutionId;

    const configParseResult = SqsReceiveConfigSchema.safeParse(stepInput);
    if (!configParseResult.success) {
        log_error("Invalid stepInput for system/sqs-receive-messages.", { errors: configParseResult.error.flatten(), receivedInput: stepInput }, correlationId);
        throw new Error(`Invalid stepInput for sqs-receive-messages: ${configParseResult.error.message}`);
    }
    const config = configParseResult.data;

    log_info(`Receiving messages from SQS queue`, { queueUrl: config.queueUrl, maxMessages: config.maxNumberOfMessages }, correlationId);

    try {
        const receiveCommand = new ReceiveMessageCommand({
            QueueUrl: config.queueUrl,
            MaxNumberOfMessages: config.maxNumberOfMessages,
            WaitTimeSeconds: config.waitTimeSeconds,
        });

        const { Messages } = await sqsClient.send(receiveCommand);

        if (!Messages || Messages.length === 0) {
            log_info('No messages received from SQS queue.', { queueUrl: config.queueUrl }, correlationId);
            return {
                outputData: {
                    messages: [],
                    messageCount: 0,
                },
            };
        }

        log_info(`Received ${Messages.length} messages from SQS.`, { queueUrl: config.queueUrl }, correlationId);

        if (config.deleteMessages) {
            const deleteCommand = new DeleteMessageBatchCommand({
                QueueUrl: config.queueUrl,
                Entries: Messages.map(msg => ({
                    Id: msg.MessageId!,
                    ReceiptHandle: msg.ReceiptHandle!,
                })),
            });
            await sqsClient.send(deleteCommand);
            log_info(`Deleted ${Messages.length} messages from SQS queue.`, { queueUrl: config.queueUrl }, correlationId);
        }

        const formattedMessages = Messages.map(msg => ({
            messageId: msg.MessageId,
            receiptHandle: msg.ReceiptHandle,
            body: msg.Body,
            attributes: msg.Attributes,
        }));

        return {
            outputData: {
                messages: formattedMessages,
                messageCount: formattedMessages.length,
            },
        };
    } catch (error: any) {
        log_error(`SQS ReceiveMessage operation failed.`, { queueUrl: config.queueUrl, error: error.message }, correlationId);
        if (['ServiceUnavailable', 'ThrottlingException'].includes(error.name)) {
            throw new TransientStepError(`SQS operation failed due to a transient error: ${error.message}`);
        }
        throw error;
    }
};
