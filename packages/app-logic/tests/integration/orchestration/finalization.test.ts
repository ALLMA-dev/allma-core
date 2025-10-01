import { vi, describe, expect, beforeAll, afterAll, beforeEach, type Mock, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// 1. Declare spy variables. They will be initialized in `beforeEach`.
let mockSnsSend: Mock;
let mockLambdaSend: Mock;
let mockExecuteApiCall: Mock;
let mockPostSimpleJson: Mock;

// 2. MOCK MODULES using a robust partial mocking pattern with `importOriginal`.
// This ensures all exports from the original module are available unless explicitly overridden.
vi.mock('@aws-sdk/client-sns', async (importOriginal) => {
    const original = await importOriginal<typeof import('@aws-sdk/client-sns')>();
    return {
        ...original,
        SNSClient: vi.fn(() => ({ send: (...args: any[]) => mockSnsSend(...args) })),
        PublishCommand: vi.fn(input => ({ input })),
    };
});
vi.mock('@aws-sdk/client-lambda', async (importOriginal) => {
    const original = await importOriginal<typeof import('@aws-sdk/client-lambda')>();
    return {
        ...original, // This correctly exports the real `InvocationType` enum.
        LambdaClient: vi.fn(() => ({ send: (...args: any[]) => mockLambdaSend(...args) })),
        InvokeCommand: vi.fn(input => ({ input })),
    };
});
vi.mock('../../../src/allma-core/utils/api-executor.js', async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
        ...original,
        executeConfiguredApiCall: (...args: any[]) => mockExecuteApiCall(...args),
        postSimpleJson: (...args: any[]) => mockPostSimpleJson(...args),
    };
});

// Now import other modules, including the SUT which depends on the mocked module.
// import { PublishCommand } from '@aws-sdk/client-sns';
// import { InvokeCommand } from '@aws-sdk/client-lambda';
import { handler as finalizeFlowHandler } from '../../../src/allma-flows/finalize-flow';
import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';
import {
  type FlowDefinition,
  type ProcessorInput,
  StepType,
  type OnCompletionAction,
  HttpMethod,
  ENV_VAR_NAMES,
  ApiCallDefinition,
} from '@allma/core-types';

// Mock other external dependencies
vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    updateFinalStatus: vi.fn().mockResolvedValue(undefined),
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));


describe('Integration: Finalize Flow Handler', () => {
    beforeAll(() => {
        process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL] = 'http://fake-resume-api.com/resume';
    });

    afterAll(async () => {
        await cleanupAllTestFlows();
        closeDbConnection();
        delete process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL];
    });

    beforeEach(() => {
        // Initialize spies before each test
        mockSnsSend = vi.fn();
        mockLambdaSend = vi.fn();
        mockExecuteApiCall = vi.fn();
        mockPostSimpleJson = vi.fn();

        // Set default mock implementations
        mockSnsSend.mockResolvedValue({ MessageId: 'sns-msg-1' });
        mockLambdaSend.mockResolvedValue({ StatusCode: 202 });
        mockExecuteApiCall.mockResolvedValue({ status: 200, data: { success: true }, headers: {}, config: {} as any, statusText: 'OK' });
        mockPostSimpleJson.mockResolvedValue({ status: 202, data: { success: true }, headers: {}, config: {} as any, statusText: 'Accepted' });
    });

    it('should execute all matching onCompletionActions for a COMPLETED flow', async () => {
        // ARRANGE
        const flowId = `finalize-actions-flow-${uuidv4()}`;
        const onCompletionActions: OnCompletionAction[] = [
            {
                actionType: 'API_CALL',
                target: 'https://api.example.com/notify',
                apiHttpMethod: HttpMethod.POST,
                payloadTemplate: { 'flow_id': '$.flowExecutionId', 'user_id': '$.user.id' },
                executeOnStatus: 'COMPLETED',
            },
            {
                actionType: 'SNS_SEND',
                target: 'arn:aws:sns:eu-north-1:123456789012:test-topic',
                payloadTemplate: { 'message': '$.final_message' },
                messageAttributesTemplate: { 'status': '$.status' },
                executeOnStatus: 'ANY',
            },
            {
                actionType: 'CUSTOM_LAMBDA_INVOKE',
                target: 'arn:aws:lambda:eu-north-1:123456789012:function:test-logger',
                payloadTemplate: { 'full_context': '$.' },
                condition: '$.user.isAdmin === true',
                executeOnStatus: 'COMPLETED',
            },
            { actionType: 'LOG_ONLY', executeOnStatus: 'FAILED' },
            { actionType: 'LOG_ONLY', condition: '$.user.isAdmin === false', executeOnStatus: 'COMPLETED' },
        ];

        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'start',
            enableExecutionLogs: false,
            steps: { 'start': { stepInstanceId: 'start', stepType: StepType.NO_OP, stepDefinitionId: 'system-noop' } },
            onCompletionActions,
        };
        await setupFlowInDB(flowDef);

        const finalizationInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'COMPLETED',
                startTime: new Date().toISOString(),
                currentContextData: {
                    user: { id: 'user-abc', isAdmin: true },
                    final_message: 'Flow finished successfully.',
                },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        await finalizeFlowHandler(finalizationInput, {} as any, {} as any);

        // ASSERT
        // API Call (Action 1)
        expect(mockExecuteApiCall).toHaveBeenCalledTimes(1);
        const apiCallDef = mockExecuteApiCall.mock.calls[0][0] as ApiCallDefinition;
        expect(apiCallDef.apiUrlTemplate.template).toBe('https://api.example.com/notify');
        expect(apiCallDef.apiHttpMethod).toBe(HttpMethod.POST);
        expect(apiCallDef.requestBodyTemplate).toBeDefined();

        // SNS Send (Action 2)
        expect(mockSnsSend).toHaveBeenCalledTimes(1);
        const snsCommand = mockSnsSend.mock.calls[0][0];
        expect(snsCommand.input.TopicArn).toBe(onCompletionActions[1].target);
        expect(JSON.parse(snsCommand.input.Message!)).toEqual({ message: 'Flow finished successfully.' });
        expect(snsCommand.input.MessageAttributes).toEqual({
            'status': { DataType: 'String', StringValue: 'COMPLETED' }
        });

        // Lambda Invoke (Action 3)
        expect(mockLambdaSend).toHaveBeenCalledTimes(1);
        const lambdaCommand = mockLambdaSend.mock.calls[0][0];
        expect(lambdaCommand.input.FunctionName).toBe(onCompletionActions[2].target);
        // FIX: The mocked payload is a string, not a Uint8Array.
        const lambdaPayload = JSON.parse(lambdaCommand.input.Payload);
        expect(lambdaPayload).toHaveProperty('full_context');
        expect(lambdaPayload.full_context.flowExecutionId).toBe(finalizationInput.runtimeState.flowExecutionId);
        expect(lambdaPayload.full_context.user.id).toBe('user-abc');
    });
    
    it('should trigger system-level resume if _flow_resume_key is present', async () => {
        // ARRANGE
        const flowId = `system-resume-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'start',
            enableExecutionLogs: false,
            steps: { 'start': { stepInstanceId: 'start', stepType: StepType.NO_OP, stepDefinitionId: 'system-noop' } },
        };
        await setupFlowInDB(flowDef);
    
        const resumeKey = `whatsapp:${uuidv4()}`;
        const finalizationInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'COMPLETED',
                startTime: new Date().toISOString(),
                currentContextData: {
                    final_output: 'This is the end.',
                    _flow_resume_key: resumeKey,
                },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
    
        // ACT
        await finalizeFlowHandler(finalizationInput, {} as any, {} as any);
    
        // ASSERT
        expect(mockPostSimpleJson).toHaveBeenCalledTimes(1);
        expect(mockPostSimpleJson).toHaveBeenCalledWith(
            process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL],
            {
                correlationValue: resumeKey,
                payload: finalizationInput.runtimeState.currentContextData,
            },
            5000
        );
    });
});
