// packages/allma-app-logic/src/allma-flows/iterative-step-processor/async-handler.ts

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
    FlowRuntimeState,
    ProcessorInput,
    StepDefinition,
    ENV_VAR_NAMES,
    WaitForExternalEventStepSchema,
    FlowDefinition,
} from '@allma/core-types';
import {
    log_info,
    log_warn,
    log_error,
} from '@allma/core-sdk';
import { TemplateService } from '../../allma-core/template-service.js';
import { processStepOutput } from '../../allma-core/data-mapper.js';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONTINUATION_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME]!;

/**
 * Handles the resumption of a flow from an asynchronous step (Wait or Poll).
 * This function is now fully generic. It uses the `outputMappings` defined on the
 * wait step in the FlowDefinition to map the incoming `resumePayload` into the
 * `currentContextData`.
 *
 * @param event The full input to the iterative step processor.
 * @param runtimeState The current state of the flow.
 * @param flowDef The loaded definition of the flow.
 * @returns The updated runtime state with the resume/polling data merged into the context.
 */
export const handleAsyncResume = (
    event: ProcessorInput,
    runtimeState: FlowRuntimeState,
    flowDef: FlowDefinition,
): FlowRuntimeState => {
    const { resumePayload, pollingResult } = event;
    const correlationId = runtimeState.flowExecutionId;
    const currentStepId = runtimeState.currentStepInstanceId;

    if (!currentStepId) {
        log_warn('handleAsyncResume called but currentStepInstanceId is missing. Cannot apply mappings.', {}, correlationId);
        return runtimeState;
    }

    const stepInstanceConfig = flowDef.steps[currentStepId];

    if (resumePayload) {
        log_info('Resuming from a WAIT_FOR_EXTERNAL_EVENT step. Applying outputMappings.', {
            step: currentStepId,
            resumePayload: JSON.stringify(resumePayload).substring(0, 200)
        }, correlationId);

        if (stepInstanceConfig.outputMappings) {
            // Treat the resumePayload as the "output" of the wait step and use the generic
            // data mapper to merge it into the main context according to the defined mappings.
            processStepOutput(
                stepInstanceConfig.outputMappings,
                resumePayload,
                runtimeState.currentContextData,
                correlationId
            );
        } else {
            log_warn(`Wait step '${currentStepId}' was resumed but has no outputMappings defined. The resume payload will be ignored.`, {}, correlationId);
        }

    } else if (pollingResult) {
        log_info('Resuming from a POLL_EXTERNAL_API step.', { pollingResult: JSON.stringify(pollingResult).substring(0, 200) }, correlationId);
        const output = pollingResult.Output ? JSON.parse(pollingResult.Output) : {};

        // Polling steps might also have output mappings.
        if (stepInstanceConfig.outputMappings) {
            processStepOutput(stepInstanceConfig.outputMappings, output, runtimeState.currentContextData, correlationId);
        } else {
            // Fallback for older polling logic
            runtimeState.currentContextData[`${currentStepId}_polling_output`] = output;
        }
    }
    
    return runtimeState;
};

/**
 * Handles a WAIT_FOR_EXTERNAL_EVENT step by saving the SFN task token to DynamoDB.
 * This is a terminal action for this Lambda invocation, as SFN will pause.
 */
export const handleWaitForEvent = async (
    taskToken: string,
    stepDef: StepDefinition,
    runtimeState: FlowRuntimeState,
    correlationId: string,
): Promise<void> => {
    const currentStepInstanceId = runtimeState.currentStepInstanceId!;
    log_info(`Pausing flow to wait for event for step: ${currentStepInstanceId}`, { taskTokenRedacted: taskToken.substring(0, 20) + "..." }, correlationId);

    console.log(JSON.stringify(runtimeState.currentContextData));
    
    const parsedWaitStepDef = WaitForExternalEventStepSchema.parse(stepDef);

    const templateService = TemplateService.getInstance();
    const correlationKey = templateService.render(parsedWaitStepDef.correlationKeyTemplate, runtimeState.currentContextData);
    
    // Add a check to prevent saving a bad key which would cause the flow to be un-resumable.
    if (!correlationKey || correlationKey.endsWith(':')) {
        log_error(
            'Generated correlationKey is invalid or empty. Flow will not be resumable.', 
            { template: parsedWaitStepDef.correlationKeyTemplate, contextKeys: Object.keys(runtimeState.currentContextData.message || {}) },
            correlationId
        );
        throw new Error('Failed to generate a valid correlationKey for wait step. Check template and context.');
    }

    const ttlInSeconds = parsedWaitStepDef.maxWaitTimeSeconds || (60 * 60 * 24 * 7); // Default 7 days
    await ddbDocClient.send(new PutCommand({
        TableName: CONTINUATION_TABLE_NAME,
        Item: {
            correlationKey: correlationKey,
            taskToken: taskToken,
            flowExecutionId: correlationId,
            stepInstanceId: currentStepInstanceId,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + ttlInSeconds,
        }
    }));
    log_info(`Task token saved for correlationKey: ${correlationKey}`, {}, correlationId);
};
