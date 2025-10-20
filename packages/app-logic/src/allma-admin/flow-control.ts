import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
    ENV_VAR_NAMES, AdminPermission,
    StatefulRedriveInputSchema,
    SandboxStepInputSchema,
    FlowRuntimeState, ProcessorInput, SfnActionType, StartFlowExecutionInput,
    ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD, METADATA_SK_VALUE,
    StepExecutionResult, ProcessorOutput, AllmaStepExecutionRecord, AllmaFlowExecutionRecordSchema, RedriveFlowApiOutput, LogStepExecutionRecord
} from '@allma/core-types';

import {
    withAdminAuth, AuthContext, createApiGatewayResponse, buildSuccessResponse, buildErrorResponse, log_error, log_info, log_warn, resolveS3Pointer, hydrateInputFromS3Pointers, log_debug,
} from '@allma/core-sdk';
import { ApiRouter } from './utils/api-router.js';

const sfnClient = new SFNClient({});
const lambdaClient = new LambdaClient({});
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const STATE_MACHINE_ARN = process.env[ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]!;
const ISP_LAMBDA_ARN = process.env[ENV_VAR_NAMES.ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN]!;
const router = new ApiRouter();

/**
 * Handles the simple "Redrive" API request.
 */
const handleSimpleRedrive = async (event: APIGatewayProxyEventV2, authContext: AuthContext, params: Record<string, string>): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    const { flowExecutionId: flowExecutionIdToRedrive } = params;
  
    log_info(`[${authContext.username}] Attempting to redrive flow execution: ${flowExecutionIdToRedrive}`, {}, correlationId);
  
    try {
      const getParams = {
        TableName: LOG_TABLE_NAME,
        Key: { flowExecutionId: flowExecutionIdToRedrive, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE },
      };
      const { Item } = await ddbDocClient.send(new GetCommand(getParams));
  
      if (!Item || Item.itemType !== ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD) {
        log_warn(`Original flow execution record not found: ${flowExecutionIdToRedrive}`, { getParams }, correlationId);
        return createApiGatewayResponse(404, buildErrorResponse(`Flow execution record ${flowExecutionIdToRedrive} not found.`, 'NOT_FOUND'), correlationId);
      }
      
      const flowRecord = AllmaFlowExecutionRecordSchema.pick({ initialInputPayload: true }).safeParse(Item);
      if (!flowRecord.success || !flowRecord.data.initialInputPayload) {
        log_error('Failed to parse initialInputPayload from flow record or payload missing.', { errors: flowRecord.success ? 'PayloadMissing' : flowRecord.error.flatten(), itemKeys: Object.keys(Item) }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Could not retrieve original input for the flow execution.', 'DATA_CORRUPTION'), correlationId);
      }
  
      const originalInput: StartFlowExecutionInput = flowRecord.data.initialInputPayload;
      const newFlowExecutionId = uuidv4();
      const redriveInput: StartFlowExecutionInput = {
        ...originalInput,
        flowExecutionId: newFlowExecutionId,
        triggerSource: `RedriveOf:${flowExecutionIdToRedrive} by ${authContext.username}`,
        enableExecutionLogs: true,
      };
  
      await sfnClient.send(new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        input: JSON.stringify(redriveInput),
        name: newFlowExecutionId,
      }));
  
      log_info(`Successfully initiated redrive for ${flowExecutionIdToRedrive}. New flowExecutionId: ${newFlowExecutionId}`, {}, correlationId);
      
      const responseBody: RedriveFlowApiOutput = {
        message: 'Flow redrive initiated successfully.',
        originalFlowExecutionId: flowExecutionIdToRedrive,
        newFlowExecutionId: newFlowExecutionId,
      };
      return createApiGatewayResponse(200, buildSuccessResponse(responseBody), correlationId);
  
    } catch (error: any) {
      log_error(`Failed to redrive flow execution ${flowExecutionIdToRedrive}`, { error: error.message, stack: error.stack }, correlationId);
      return createApiGatewayResponse(500, buildErrorResponse('Internal server error during flow redrive.', 'SERVER_ERROR'), correlationId);
    }
};

/**
 * Handles the Stateful Redrive API request.
 */
const handleStatefulRedrive = async (event: APIGatewayProxyEventV2, authContext: AuthContext, params: Record<string, string>): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    const { flowExecutionId } = params;
    
    const validation = StatefulRedriveInputSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!validation.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input.', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
    }
    const { startFromStepInstanceId, modifiedContextData } = validation.data;

    try {
        const { Item: metadata } = await ddbDocClient.send(new GetCommand({
            TableName: LOG_TABLE_NAME,
            Key: { flowExecutionId, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE }
        }));
        if (!metadata || metadata.itemType !== ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD) {
            return createApiGatewayResponse(404, buildErrorResponse('Original flow execution not found.', 'NOT_FOUND'), correlationId);
        }

        let contextToUse = modifiedContextData;
        
        if (!contextToUse) {
            log_info(`modifiedContextData not provided. Attempting to fetch historical context for step '${startFromStepInstanceId}'.`, {}, correlationId);
            const queryResponse = await ddbDocClient.send(new QueryCommand({
                TableName: LOG_TABLE_NAME,
                KeyConditionExpression: 'flowExecutionId = :pk AND begins_with(eventTimestamp_stepInstanceId_attempt, :skPrefix)',
                ExpressionAttributeValues: { ':pk': flowExecutionId, ':skPrefix': `STEP#` },
                ScanIndexForward: true,
            }));
            const targetStepRecord = queryResponse.Items?.find(
                (item) => item.stepInstanceId === startFromStepInstanceId && item.status === 'STARTED'
            ) as AllmaStepExecutionRecord | undefined;

            if (!targetStepRecord || !targetStepRecord.fullRecordS3Pointer) {
                return createApiGatewayResponse(404, buildErrorResponse(`Could not find a 'STARTED' record with S3 pointer for step '${startFromStepInstanceId}' in the execution log.`, 'NOT_FOUND'), correlationId);
            }

            const fullStepRecord = await resolveS3Pointer(targetStepRecord.fullRecordS3Pointer, correlationId);

            if (!fullStepRecord.inputMappingContext) {
                 return createApiGatewayResponse(404, buildErrorResponse(`The detailed log for step '${startFromStepInstanceId}' is missing the required 'inputMappingContext'. Cannot redrive from this step.`, 'NOT_FOUND'), correlationId);
            }
            contextToUse = fullStepRecord.inputMappingContext;
            log_info(`Successfully retrieved historical input context for step '${startFromStepInstanceId}' from S3.`, {}, correlationId);
        }

        const newFlowExecutionId = uuidv4();
        const startState: FlowRuntimeState = {
            flowDefinitionId: metadata.flowDefinitionId,
            flowDefinitionVersion: metadata.flowDefinitionVersion,
            flowExecutionId: newFlowExecutionId,
            enableExecutionLogs: true,
            currentStepInstanceId: startFromStepInstanceId,
            status: 'RUNNING',
            startTime: new Date().toISOString(),
            currentContextData: contextToUse,
            stepRetryAttempts: {},
            _internal: {},
        };

        const sfnInput: StartFlowExecutionInput = {
            flowDefinitionId: startState.flowDefinitionId,
            flowVersion: String(startState.flowDefinitionVersion),
            initialContextData: {}, // Correctly added to satisfy the type
            flowExecutionId: newFlowExecutionId,
            triggerSource: `StatefulRedriveOf:${flowExecutionId} by ${authContext.username}`,
            executionOverrides: { startFromState: startState },
        };

        await sfnClient.send(new StartExecutionCommand({
            stateMachineArn: STATE_MACHINE_ARN,
            input: JSON.stringify(sfnInput),
            name: newFlowExecutionId,
        }));

        log_info(`Successfully initiated stateful redrive for ${flowExecutionId}. New execution ID: ${newFlowExecutionId}`, {}, correlationId);
        return createApiGatewayResponse(200, buildSuccessResponse({ newFlowExecutionId }), correlationId);

    } catch (e: any) {
        log_error('Stateful redrive failed.', { error: e.message, stack: e.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal server error during redrive.', 'SERVER_ERROR'), correlationId);
    }
};

/**
 * Handles the Sandbox Step Execution API request.
 */
const handleSandboxStep = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    const validation = SandboxStepInputSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!validation.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input.', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
    }

    const { flowDefinitionId, flowDefinitionVersion, stepInstanceId, contextData } = validation.data;
    
    const sandboxState: FlowRuntimeState = {
        flowDefinitionId,
        flowDefinitionVersion,
        flowExecutionId: `sandbox-${correlationId}`,
        enableExecutionLogs: true, // Force logs to get detailed metadata
        currentStepInstanceId: stepInstanceId,
        status: 'RUNNING',
        startTime: new Date().toISOString(),
        currentContextData: contextData,
        stepRetryAttempts: {},
        _internal: {
            sandboxMode: true, // NEW: Enable sandbox mode
        },
    };

    const ispPayload: ProcessorInput = { runtimeState: sandboxState, sfnAction: SfnActionType.PROCESS_STEP };

    try {
        log_info(`[${authContext.username}] Invoking ISP for sandbox execution of step '${stepInstanceId}'`, {}, correlationId);
        const command = new InvokeCommand({
            FunctionName: ISP_LAMBDA_ARN,
            Payload: JSON.stringify(ispPayload),
            InvocationType: 'RequestResponse',
        });
        
        const result = await lambdaClient.send(command);

        if (result.FunctionError) {
             const errorPayload = result.Payload ? JSON.parse(new TextDecoder().decode(result.Payload)) : { errorMessage: 'Unknown error' };
             throw new Error(`Sandbox invocation failed in ISP: ${errorPayload.errorMessage || 'See logs'}`);
        }
        
        const ispOutput: ProcessorOutput = JSON.parse(new TextDecoder().decode(result.Payload));
        log_debug('Received ISP output in sandbox handler', { ispOutput }, correlationId);

        const finalState = ispOutput.runtimeState;
        
        // NEW LOGIC: Try to get the full debug log from S3 if available
        const debugLogPointer = finalState._internal?.sandboxDebugLogS3Pointer;
        let fullDebugLog: LogStepExecutionRecord | undefined;

        if (debugLogPointer) {
            try {
                log_debug('Fetching full debug log from S3 for sandbox execution.', { pointer: debugLogPointer }, correlationId);
                fullDebugLog = (await resolveS3Pointer(debugLogPointer, correlationId)) as LogStepExecutionRecord;
            } catch (e: any) {
                log_warn('Failed to fetch full debug log from S3 for sandbox execution.', { error: e.message }, correlationId);
                // Fallback to legacy extraction if S3 fetch fails
            }
        } else {
            log_warn('No debug log S3 pointer returned from sandbox execution. Debug info will be incomplete.', {}, correlationId);
        }

        // Construct the result, preferring the full log if available
        let sandboxResult: StepExecutionResult;

        if (fullDebugLog) {
             sandboxResult = {
                success: fullDebugLog.status === 'COMPLETED',
                outputData: fullDebugLog.outputData || undefined,
                errorInfo: fullDebugLog.errorInfo,
                logs: fullDebugLog, // The full, rich debug log
            };
        } else {
            // Fallback legacy logic
            let handlerResult = finalState._internal?.currentStepHandlerResult;
            if (handlerResult?.outputData) {
                handlerResult.outputData = await hydrateInputFromS3Pointers(handlerResult.outputData, correlationId);
            }
            // Try to extract legacy logs if they exist in the output
             const logs = handlerResult?.outputData?._meta;
             if (handlerResult?.outputData?._meta) {
                 delete handlerResult.outputData._meta;
             }
             sandboxResult = {
                success: !finalState.errorInfo,
                ...(finalState.errorInfo && { errorInfo: finalState.errorInfo }),
                ...(handlerResult?.outputData && { outputData: handlerResult.outputData }),
                ...(logs && { logs }),
            };
        }

        return createApiGatewayResponse(200, buildSuccessResponse(sandboxResult), correlationId);

    } catch (e: any) {
        log_error(`Sandbox execution failed for step '${stepInstanceId}'`, { error: e.message, stack: e.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Sandbox execution failed.', 'SERVER_ERROR', { details: e.message }), correlationId);
    }
};

/**
 * Handles the "Run Test Execution" API request from the Admin UI.
 */
const handleExecuteFlow = async (event: APIGatewayProxyEventV2, authContext: AuthContext, params: Record<string, string>): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    const { flowId, versionNumber } = params;

    // Note: A Zod schema will be added for this in a subsequent step.
    const body = JSON.parse(event.body || '{}');
    const initialContextData = body.initialContextData || {};

    try {
        const newFlowExecutionId = uuidv4();
        const startInput: StartFlowExecutionInput = {
            flowDefinitionId: flowId,
            flowVersion: versionNumber,
            initialContextData,
            flowExecutionId: newFlowExecutionId,
            triggerSource: `AdminUITestExecution by ${authContext.username}`,
            enableExecutionLogs: true,
        };

        await sfnClient.send(new StartExecutionCommand({
            stateMachineArn: STATE_MACHINE_ARN,
            input: JSON.stringify(startInput),
            name: newFlowExecutionId,
        }));

        log_info(`Successfully initiated test execution for flow ${flowId} v${versionNumber}. New flowExecutionId: ${newFlowExecutionId}`, {}, correlationId);

        const responseBody = {
            newFlowExecutionId,
        };
        return createApiGatewayResponse(200, buildSuccessResponse(responseBody), correlationId);

    } catch (error: any) {
        log_error(`Failed to start test execution for flow ${flowId} v${versionNumber}`, { error: error.message, stack: error.stack }, correlationId);
        return createApiGatewayResponse(500, buildErrorResponse('Internal server error during flow execution.', 'SERVER_ERROR'), correlationId);
    }
};

// Register routes
router.post('/allma/flow-executions/{flowExecutionId}/redrive', handleSimpleRedrive, { requiredPermission: AdminPermission.DEFINITIONS_WRITE });
router.post('/allma/flow-executions/{flowExecutionId}/stateful-redrive', handleStatefulRedrive, { requiredPermission: AdminPermission.DEFINITIONS_WRITE });
router.post('/allma/flows/sandbox/step', handleSandboxStep, { requiredPermission: AdminPermission.DEFINITIONS_WRITE });
router.post('/allma/flows/{flowId}/versions/{versionNumber}/execute', handleExecuteFlow, { requiredPermission: AdminPermission.DEFINITIONS_WRITE });

const mainHandler = async (event: APIGatewayProxyEventV2, authContext: AuthContext): Promise<APIGatewayProxyResultV2> => {
    const correlationId = event.requestContext.requestId;
    log_info(`[${authContext.username}] requested flow control action: ${event.requestContext.http.method} ${event.rawPath}`, {}, correlationId);
    return router.getHandler()(event, authContext);
};

export const handler = withAdminAuth(mainHandler);