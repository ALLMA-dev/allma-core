// packages/allma-app-logic/src/allma-core/data-loaders/sqs-get-queue-attributes.ts

import { SQSClient, GetQueueAttributesCommand, QueueAttributeName } from '@aws-sdk/client-sqs';
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

// Zod schema for validating this module's specific configuration
const SqsGetAttributesConfigSchema = z.object({
    queueUrl: z.string().url(),
    attributeNames: z.array(z.nativeEnum(QueueAttributeName)).min(1),
});

/**
 * A standard StepHandler for getting attributes from an SQS queue.
 * It now expects a pre-rendered configuration.
 */
export const handleSqsGetQueueAttributes: StepHandler = async (
    stepDefinition: StepDefinition,
    stepInput: Record<string, any>,
    runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
    const correlationId = runtimeState.flowExecutionId;

    const configParseResult = SqsGetAttributesConfigSchema.safeParse(stepInput);
    if (!configParseResult.success) {
        log_error("Invalid stepInput for system/sqs-get-queue-attributes.", {
            errors: configParseResult.error.flatten(),
            receivedInput: stepInput
        }, correlationId);
        throw new Error(`Invalid stepInput for sqs-get-queue-attributes: ${configParseResult.error.message}`);
    }
    const config = configParseResult.data;

    log_info(`Getting attributes from SQS queue`, { queueUrl: config.queueUrl, attributes: config.attributeNames }, correlationId);

    try {
        const command = new GetQueueAttributesCommand({
            QueueUrl: config.queueUrl,
            AttributeNames: config.attributeNames,
        });

        const { Attributes } = await sqsClient.send(command);

        if (!Attributes) {
            log_info('No attributes returned from SQS queue.', { queueUrl: config.queueUrl }, correlationId);
            return { outputData: { attributes: {} } };
        }

        const parsedAttributes: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(Attributes)) {
            const numValue = Number(value);
            parsedAttributes[key] = isNaN(numValue) ? value : numValue;
        }

        log_info(`Successfully retrieved queue attributes.`, { attributes: parsedAttributes }, correlationId);

        return {
            outputData: {
                attributes: parsedAttributes,
            },
        };
    } catch (error: any) {
        log_error(`SQS GetQueueAttributes operation failed.`, { queueUrl: config.queueUrl, error: error.message }, correlationId);
        if (['ServiceUnavailable', 'ThrottlingException'].includes(error.name)) {
            throw new TransientStepError(`SQS operation failed due to a transient error: ${error.message}`);
        }
        throw error;
    }
};
