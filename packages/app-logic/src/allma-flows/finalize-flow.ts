import { Handler } from 'aws-lambda';
import { FlowRuntimeState, 
    AllmaError, 
    ENV_VAR_NAMES, 
    S3PointerSchema, 
    S3Pointer, 
    JsonPathString,
    ProcessorInput,
    ApiCallDefinition,
    TemplateContextMappingItem,
 } from '@allma/core-types';
import { log_error, log_info, log_warn, log_debug } from '@allma/core-sdk';
import { loadFlowDefinition } from '../allma-core/config-loader.js';
import { JSONPath } from 'jsonpath-plus';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand, MessageAttributeValue } from '@aws-sdk/client-sns';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';

import { executeConfiguredApiCall, postSimpleJson } from '../allma-core/utils/api-executor.js';
import { executionLoggerClient } from '../allma-core/execution-logger-client.js';
import { TemplateService } from '../allma-core/template-service.js';
import { evaluateCondition } from '../allma-core/utils/condition-evaluator.js';

const s3Client = new S3Client({});
const snsClient = new SNSClient({}); 
const lambdaClient = new LambdaClient({});
const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;
const MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT = 220 * 1024;
const MAX_CONTEXT_DATA_SIZE_BYTES = process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] 
    ? parseInt(process.env[ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES] || '', 10) 
    : MAX_CONTEXT_DATA_SIZE_BYTES_DEFAULT;

interface FinalizeOutput {
    status: 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED'; // Matches FlowRuntimeState['status'] subset
    finalContextDataS3Pointer?: S3Pointer; // If contextData was offloaded
    errorInfo?: AllmaError;
}

const storeContextDataToS3 = async (flowExecutionId: string, contextData: Record<string, any>, correlationId: string): Promise<S3Pointer> => {
    const s3Key = `final_context/${flowExecutionId}/${new Date().toISOString()}_context.json`;
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: EXECUTION_TRACES_BUCKET_NAME,
            Key: s3Key,
            Body: JSON.stringify(contextData),
            ContentType: 'application/json',
        }));
        log_info('Stored large finalContextData to S3', { bucket: EXECUTION_TRACES_BUCKET_NAME, key: s3Key }, correlationId);
        return S3PointerSchema.parse({ bucket: EXECUTION_TRACES_BUCKET_NAME, key: s3Key });
    } catch (e: any) {
        log_error('Failed to store finalContextData to S3', { error: e.message, s3Key }, correlationId);
        throw e; // Re-throw to indicate failure
    }
};

/**
 * System-level function to handle resuming flows when triggered by another flow.
 * This is a fire-and-forget operation. Failure here should not fail the finalization.
 */
const handleSystemLevelResume = async (runtimeState: FlowRuntimeState): Promise<void> => {
    const correlationId = runtimeState.flowExecutionId;
    // Read env var here to pick up values set dynamically (e.g., in tests)
    const resumeApiUrl = process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL];

    log_debug(`handleSystemLevelResume configured with RESUME_API_URL: ${resumeApiUrl}`, {}, correlationId);

    if (!resumeApiUrl) {
        log_debug('ALLMA_RESUME_API_URL not configured. Skipping system-level resume check.', {}, correlationId);
        return;
    }

    const context = runtimeState.currentContextData || {};

    try {
        const resumeKey = context._flow_resume_key;

        if (typeof resumeKey === 'string' && resumeKey) {
            log_info('Found _flow_resume_key in context. Triggering system-level resume.', { resumeKey }, correlationId);
            
            const resumePayload = {
                correlationValue: resumeKey,
                payload: runtimeState.currentContextData, // Send the original context data as the payload
            };

            await postSimpleJson(resumeApiUrl, resumePayload, 5000);

            log_info('Successfully posted to resume API.', { resumeKey }, correlationId);
        } else {
            log_debug('No _flow_resume_key found in context. Skipping system-level resume.', {}, correlationId);
        }
    } catch (error: any) {
        log_error('Failed to execute system-level resume call.', { 
            errorMessage: error.message, 
            responseStatus: (error as any).response?.status, 
            responseData: (error as any).response?.data 
        }, correlationId);
        // Do NOT re-throw. This is a non-critical, secondary action.
    }
};

export const handler: Handler<ProcessorInput, FinalizeOutput> = async (event) => {
    const runtimeState = event.runtimeState;
    const correlationId = runtimeState.flowExecutionId;
    let finalStatusFromInput: FlowRuntimeState['status'] = runtimeState.status;
  
    if (finalStatusFromInput === 'RUNNING' || finalStatusFromInput === 'INITIALIZING') {
        finalStatusFromInput = runtimeState.errorInfo ? 'FAILED' : 'COMPLETED';
    }
  
    const endTime = new Date().toISOString();
    log_info(`Finalizing flow execution with status: ${finalStatusFromInput}`, { flowExecutionId: correlationId }, correlationId);
  
    let finalOutput: FinalizeOutput; // This is guaranteed to be assigned in try/catch.
    let finalContextDataS3Pointer: S3Pointer | undefined;

    // Determine if we should log this finalization based on config OR failure status
    const shouldLog = runtimeState.enableExecutionLogs || finalStatusFromInput === 'FAILED';

    try {
      runtimeState.endTime = endTime;
      runtimeState.status = finalStatusFromInput;
  
      const contextDataString = JSON.stringify(runtimeState.currentContextData);
      if (Buffer.from(contextDataString).length > MAX_CONTEXT_DATA_SIZE_BYTES) {
          log_info(`Final context data is large (${Buffer.from(contextDataString).length} bytes), storing in S3.`, {}, correlationId);
          finalContextDataS3Pointer = await storeContextDataToS3(correlationId, runtimeState.currentContextData, correlationId);
      }
  
      // Asynchronously update the main flow execution record in DynamoDB via the logger
      if (shouldLog) {
        if (finalStatusFromInput === 'FAILED' && runtimeState._internal && !runtimeState._internal.loggingBootstrapped) {
            log_warn('Finalization failed for an unlogged flow. Bootstrapping logging now.', {}, correlationId);
            const originalStartInput = runtimeState._internal.originalStartInput;
            if (originalStartInput) {
                await executionLoggerClient.createMetadataRecord({
                    flowExecutionId: correlationId,
                    flowDefinitionId: runtimeState.flowDefinitionId,
                    flowDefinitionVersion: runtimeState.flowDefinitionVersion,
                    startTime: runtimeState.startTime,
                    initialInputPayload: originalStartInput,
                    triggerSource: originalStartInput.triggerSource,
                    enableExecutionLogs: true,
                });
                runtimeState._internal.loggingBootstrapped = true;
            }
        }
        
        await executionLoggerClient.updateFinalStatus({
            flowExecutionId: correlationId,
            status: finalStatusFromInput,
            endTime: endTime,
            finalContextDataS3Pointer: finalContextDataS3Pointer,
            errorInfo: runtimeState.errorInfo,
        });
        log_info('Main flow execution record update queued for logging.', { flowExecutionId: correlationId, status: finalStatusFromInput }, correlationId);
      }

      // Perform system-level resume check and action
      await handleSystemLevelResume(runtimeState);
  
      const flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
      const templateService = TemplateService.getInstance();

      if (flowDef.onCompletionActions && flowDef.onCompletionActions.length > 0) {
          log_info('Processing onCompletionActions...', { count: flowDef.onCompletionActions.length}, correlationId);
          const templateSourceContext = { ...runtimeState, ...runtimeState.currentContextData };

          for (const action of flowDef.onCompletionActions) {
              try {
                  if (action.executeOnStatus !== 'ANY' && action.executeOnStatus !== finalStatusFromInput) {
                      log_debug('Skipping onCompletionAction due to status mismatch.', { actionType: action.actionType, executeOnStatus: action.executeOnStatus, finalStatus: finalStatusFromInput }, correlationId);
                      continue;
                  }
                  if (action.condition) {
                      const { result: conditionMet } = await evaluateCondition(action.condition, templateSourceContext, correlationId);
                      if (!conditionMet) {
                          log_debug('Skipping onCompletionAction due to condition not met.', { actionType: action.actionType, condition: action.condition }, correlationId);
                          continue;
                      }
                  }

                  const payloadTemplateForBuilder: Record<string, TemplateContextMappingItem> | undefined = action.payloadTemplate
                      ? Object.fromEntries(
                          Object.entries(action.payloadTemplate).map(([key, jsonPath]) => [
                              key,
                              { 
                                  sourceJsonPath: jsonPath, 
                                  formatAs: 'RAW', 
                                  joinSeparator: '\n' 
                              }
                          ])
                      )
                      : undefined;
                  const { context: payload } = await templateService.buildContextFromMappings(payloadTemplateForBuilder, templateSourceContext, correlationId);

                  switch(action.actionType) {
                      case 'API_CALL':
                          if (action.target && action.apiHttpMethod) {
                              const apiCallDefForExecutor: ApiCallDefinition = {
                                  apiUrlTemplate: { template: action.target },
                                  apiHttpMethod: action.apiHttpMethod,
                                  requestBodyTemplate: payloadTemplateForBuilder,
                              };
                              log_info('Executing onCompletion action: API_CALL', { url: action.target, method: action.apiHttpMethod }, correlationId);
                              await executeConfiguredApiCall(apiCallDefForExecutor, runtimeState, correlationId, templateSourceContext);
                              log_info('onCompletion action API_CALL executed successfully.', { url: action.target }, correlationId);
                          } else {
                              log_warn('API_CALL onCompletionAction is missing target URL or apiHttpMethod.', { action }, correlationId);
                          }
                          break;

                      case 'SNS_SEND':
                          if (action.target) { 
                              log_info('Executing onCompletion action: SNS_SEND', { topicArn: action.target }, correlationId);
                              const messageAttributes: Record<string, MessageAttributeValue> = {};
                              if (action.messageAttributesTemplate) {
                                  for (const [key, jsonPathValue] of Object.entries(action.messageAttributesTemplate)) {
                                      const val = JSONPath({ path: jsonPathValue as JsonPathString, json: templateSourceContext, wrap: false });
                                      if (val !== undefined) {
                                          if (typeof val === 'number') messageAttributes[key] = { DataType: 'Number', StringValue: String(val) };
                                          else if (Array.isArray(val) && val.every(item => typeof item === 'string')) messageAttributes[key] = { DataType: 'String.Array', StringValue: JSON.stringify(val) };
                                          else if (typeof val === 'string') messageAttributes[key] = { DataType: 'String', StringValue: val };
                                          else if (Buffer.isBuffer(val)) messageAttributes[key] = { DataType: 'Binary', BinaryValue: val};
                                          else messageAttributes[key] = { DataType: 'String', StringValue: String(val) };
                                      }
                                  }
                              }
                              await snsClient.send(new PublishCommand({
                                  TopicArn: action.target,
                                  Message: JSON.stringify(payload), 
                                  MessageAttributes: Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined,
                              }));
                              log_info('onCompletion action SNS_SEND executed successfully.', { topicArn: action.target }, correlationId);
                          } else {
                              log_warn('SNS_SEND onCompletionAction is missing target Topic ARN.', { action }, correlationId);
                          }
                          break;
                      case 'CUSTOM_LAMBDA_INVOKE':
                            if (action.target) {
                                log_info('Executing onCompletion action: CUSTOM_LAMBDA_INVOKE', { lambdaArn: action.target, payload }, correlationId);
                                await lambdaClient.send(new InvokeCommand({
                                    FunctionName: action.target,
                                    Payload: JSON.stringify(payload),
                                    InvocationType: InvocationType.Event,
                                }));
                                log_info('onCompletion action CUSTOM_LAMBDA_INVOKE executed successfully.', { lambdaArn: action.target }, correlationId);
                            } else {
                                log_warn('CUSTOM_LAMBDA_INVOKE onCompletionAction is missing target Lambda ARN.', { action }, correlationId);
                            }
                            break;
                      case 'LOG_ONLY':
                          log_info('Executing onCompletion action: LOG_ONLY', { payload }, correlationId);
                          break;
                      
                      case 'SQS_SEND':
                          log_warn('SQS_SEND onCompletionAction not fully implemented yet.', { action }, correlationId);
                          break;

                      default:
                          log_warn('Unsupported onCompletionAction type encountered.', { action }, correlationId);
                  }
              } catch(actionError: any) {
                  log_error('Failed to execute an onCompletionAction', { actionType: action.actionType, target: action.target, error: actionError.message, stack: actionError.stack }, correlationId);
              }
          }
      }

      finalOutput = {
          status: finalStatusFromInput as FinalizeOutput['status'],
          ...(finalContextDataS3Pointer && { finalContextDataS3Pointer }),
          ...(runtimeState.errorInfo && { errorInfo: runtimeState.errorInfo }),
      };

    } catch (error: any) {
      log_error('Critical error during flow finalization', { error: error.message, stack: error.stack }, correlationId);

      const errorInfo: AllmaError = {
          errorName: "FinalizationError",
          errorMessage: `Failed during finalization step: ${error.message}`,
          errorDetails: { stack: error.stack?.substring(0, 1000) },
          isRetryable: false,
      };

      if (shouldLog) {
        if (runtimeState._internal && !runtimeState._internal.loggingBootstrapped) {
            const originalStartInput = runtimeState._internal.originalStartInput;
            if (originalStartInput) {
                await executionLoggerClient.createMetadataRecord({
                    flowExecutionId: correlationId,
                    flowDefinitionId: runtimeState.flowDefinitionId,
                    flowDefinitionVersion: runtimeState.flowDefinitionVersion,
                    startTime: runtimeState.startTime,
                    initialInputPayload: originalStartInput,
                    triggerSource: originalStartInput.triggerSource,
                    enableExecutionLogs: true,
                });
            }
        }
        await executionLoggerClient.updateFinalStatus({
            flowExecutionId: correlationId,
            status: 'FAILED',
            endTime: endTime,
            errorInfo: errorInfo,
        });
      }

      finalOutput = {
        status: 'FAILED',
        errorInfo: errorInfo
      };
    }
    
    if (shouldLog) {
        const stepEndTime = new Date().toISOString();
        await executionLoggerClient.logStepExecution({
            flowExecutionId: correlationId,
            stepInstanceId: '_FINALIZE_FLOW',
            stepDefinitionId: '_SYSTEM_INTERNAL',
            stepType: 'FINALIZE_FLOW',
            status: finalStatusFromInput === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
            startTime: endTime,
            eventTimestamp: stepEndTime,
            endTime: stepEndTime,
            durationMs: new Date(stepEndTime).getTime() - new Date(endTime).getTime(),
            errorInfo: runtimeState.errorInfo,
            inputMappingResult: event.runtimeState,
            outputData: finalOutput,
        });
    }

    return finalOutput;
};
