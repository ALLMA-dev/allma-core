import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import {
    ENV_VAR_NAMES,
    StartFlowExecutionInput,
    TriggerFlowApiOutput,
    TriggerFlowApiInputSchema,
} from '@allma/core-types';
import {
    createApiGatewayResponse,
    buildSuccessResponse,
    buildErrorResponse,
    log_error,
    log_info,
    log_debug,
    log_warn, 
} from '@allma/core-sdk';
import { FlowActivationService } from '../allma-admin/services/flow-activation.service.js'; 

const sqsClient = new SQSClient({});
const FLOW_START_QUEUE_URL = process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL];

/**
 * Handles HTTP requests to trigger a new flow execution.
 * This function acts as a public-facing webhook, validating the request
 * and placing a message on the internal SQS queue to start the flow.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    log_info('Flow trigger API handler invoked', {}, correlationId);

    if (!FLOW_START_QUEUE_URL) {
        log_error('FATAL: ALLMA_FLOW_START_REQUEST_QUEUE_URL environment variable is not set.', {}, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Service is not configured correctly.', 'CONFIGURATION_ERROR'), correlationId);
    }

    const { flowId } = event.pathParameters || {};
    if (!flowId) {
        return createApiGatewayResponse(400, buildErrorResponse('Missing flowId path parameter.', 'VALIDATION_ERROR'), correlationId);
    }

    // Check if flow is active before proceeding
    const isActive = await FlowActivationService.isFlowActive(flowId);
    if (!isActive) {
        log_warn(`Attempted to trigger inactive flow '${flowId}'. The flow is part of a disabled agent.`, {}, correlationId);
        return createApiGatewayResponse(403, buildErrorResponse('Flow is currently disabled and cannot be triggered.', 'FORBIDDEN'), correlationId);
    }

    try {
        const initialContextData = JSON.parse(event.body || '{}');
        const bodyValidation = TriggerFlowApiInputSchema.safeParse(initialContextData);
        if (!bodyValidation.success) {
            return createApiGatewayResponse(400, buildErrorResponse('Invalid request body.', 'VALIDATION_ERROR', bodyValidation.error.flatten()), correlationId);
        }

        const { version, enableExecutionLogs } = event.queryStringParameters || {};
        const flowExecutionId = uuidv4();

        const startFlowInput: StartFlowExecutionInput = {
            flowDefinitionId: flowId,
            flowVersion: version || 'LATEST_PUBLISHED',
            initialContextData: initialContextData,
            flowExecutionId: flowExecutionId,
            triggerSource: `ApiTrigger:${event.requestContext.http.sourceIp}`,
            ...(enableExecutionLogs && { enableExecutionLogs: enableExecutionLogs.toLowerCase() === 'true' }),
        };

        log_debug('Constructed StartFlowExecutionInput, sending to SQS...', { input: startFlowInput }, correlationId);

        await sqsClient.send(new SendMessageCommand({
            QueueUrl: FLOW_START_QUEUE_URL,
            MessageBody: JSON.stringify(startFlowInput),
        }));

        log_info(`Successfully queued request to start flow`, { flowId, flowExecutionId }, correlationId);

        const responseBody: TriggerFlowApiOutput = {
            message: 'Flow execution request accepted.',
            flowExecutionId: flowExecutionId,
        };

        // 202 Accepted is the correct semantic response for an async initiation
        return createApiGatewayResponse(202, buildSuccessResponse(responseBody), correlationId);

    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return createApiGatewayResponse(400, buildErrorResponse('Invalid JSON in request body.', 'VALIDATION_ERROR'), correlationId);
        }
        log_error('Failed to process flow trigger request.', { error: error.message, stack: error.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal server error.', 'SERVER_ERROR', { error: error.message }), correlationId);
    }
};