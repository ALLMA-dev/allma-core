import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// SUT
import { handler as iterativeStepProcessorHandler } from '../../../src/allma-flows/iterative-step-processor';
import { handler as finalizeFlowHandler } from '../../../src/allma-flows/finalize-flow';

// Mocks
import * as stepHandlerRegistry from '../../../src/allma-core/step-handlers/handler-registry';
import * as executionLogger from '../../../src/allma-core/execution-logger-client';
import * as securityValidator from '../../../src/allma-core/security-validator';

// Helpers
import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';

// Errors & Types
import { ContentBasedRetryableError, RetryableStepError, SecurityViolationError } from '@allma/core-types';
import {
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  StepType,
  FlowRuntimeState,
  LLMProviderType,
  StepHandler,
} from '@allma/core-types';

vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
    createMetadataRecord: vi.fn().mockResolvedValue(undefined),
    updateFinalStatus: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-core/step-handlers/handler-registry');
vi.mock('../../../src/allma-core/security-validator');

const mockedGetStepHandler = vi.mocked(stepHandlerRegistry.getStepHandler);
const mockedExecutionLogger = vi.mocked(executionLogger.executionLoggerClient);
const mockedValidateLlmOutput = vi.mocked(securityValidator.validateLlmOutput);
let originalRegistry: typeof stepHandlerRegistry;

/**
 * Creates a mock implementation for the getStepHandler function.
 * This allows overriding a specific step handler while using the original implementation for others.
 * @param override - The step handler to override.
 * @returns A function that can be used as a mock implementation for getStepHandler.
 */
const createMockStepHandler = (override: { type: StepType, handler: StepHandler }) => {
  return (stepType: StepType) => {
    if (stepType === override.type) {
      return override.handler;
    }
    return originalRegistry.getStepHandler(stepType);
  };
};

describe('Integration: Iterative Step Processor - Error Handling and Retries', () => {

    beforeAll(async () => {
      originalRegistry = await vi.importActual<typeof stepHandlerRegistry>('../../../src/allma-core/step-handlers/handler-registry');
    });

    afterAll(async () => {
        await cleanupAllTestFlows();
        closeDbConnection();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetStepHandler.mockImplementation(originalRegistry.getStepHandler);
        mockedValidateLlmOutput.mockResolvedValue(undefined);
    });

    it('should transition to a fallback step on terminal error', async () => {
        const flowId = `fallback-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'failing_step',
            enableExecutionLogs: false,
            steps: {
                'failing_step': {
                    stepInstanceId: 'failing_step', stepType: StepType.DATA_LOAD,
                    moduleIdentifier: 'system/s3-data-loader',
                    stepDefinitionId: 'system/s3-data-loader',
                    onError: { fallbackStepInstanceId: 'fallback_step',  continueOnFailure: false}
                },
                'fallback_step': { stepInstanceId: 'fallback_step', stepType: StepType.END_FLOW },
            }
        };
        await setupFlowInDB(flowDef);
        const failingHandler = vi.fn().mockRejectedValue(new Error('S3 Bucket Not Found'));
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.DATA_LOAD, handler: failingHandler }));
        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'failing_step',
                currentContextData: {},
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;
        expect(failingHandler).toHaveBeenCalledTimes(1);
        expect(result.runtimeState.status).toBe('RUNNING');
        expect(result.runtimeState.errorInfo).toBeUndefined();
        expect(result.runtimeState.currentStepInstanceId).toBe('fallback_step');
    });

    it('should fail the flow if a step fails without a fallback', async () => {
        const flowId = `fail-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'failing_step',
            enableExecutionLogs: false,
            steps: {
                'failing_step': {
                    stepInstanceId: 'failing_step', stepType: StepType.DATA_LOAD,
                    moduleIdentifier: 'system/s3-data-loader',
                    stepDefinitionId: 'system/s3-data-loader',
                },
            }
        };
        await setupFlowInDB(flowDef);
        const failingHandler = vi.fn().mockRejectedValue(new Error('S3 Bucket Not Found'));
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.DATA_LOAD, handler: failingHandler }));
        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'failing_step',
                currentContextData: {},
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;
        expect(failingHandler).toHaveBeenCalledTimes(1);
        expect(result.runtimeState.status).toBe('FAILED');
        expect(result.runtimeState.errorInfo).toBeDefined();
        expect(result.runtimeState.errorInfo?.errorMessage).toBe('S3 Bucket Not Found');
        expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
    });

    it('should throw RetryableStepError for content error until retry limit is exhausted, then fail the flow', async () => {
        const flowId = `content-retry-flow-${uuidv4()}`;
        const failingStepId = 'failing_content_step';
        const maxRetries = 3;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: failingStepId,
            enableExecutionLogs: true,
            steps: {
                [failingStepId]: {
                    stepInstanceId: failingStepId, stepType: StepType.LLM_INVOCATION,
                    stepDefinitionId: 'system-llm-invocation',
                    llmProvider: LLMProviderType.GEMINI,
                    modelId: 'gemini-pro',
                    onError: { retryOnContentError: { count: maxRetries, intervalSeconds: 1, backoffRate: 1 }, continueOnFailure: false } 
                }
            }
        };
        await setupFlowInDB(flowDef);
        const contentErrorMessage = 'Invalid JSON output: Content error';
        const contentThrowingHandler = vi.fn().mockRejectedValue(new ContentBasedRetryableError(contentErrorMessage));
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.LLM_INVOCATION, handler: contentThrowingHandler }));
        const baseRuntimeState: FlowRuntimeState = {
            flowDefinitionId: flowId, flowDefinitionVersion: 1,
            flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
            startTime: new Date().toISOString(),
            currentStepInstanceId: failingStepId,
            currentContextData: {}, enableExecutionLogs: true, stepRetryAttempts: {},
        };
        await expect(iterativeStepProcessorHandler({ runtimeState: baseRuntimeState }, {} as any, {} as any)).rejects.toThrow(RetryableStepError);
        expect(baseRuntimeState.stepRetryAttempts[failingStepId]).toBe(1);
        const runtimeStateAttempt2 = { ...baseRuntimeState, stepRetryAttempts: { [failingStepId]: 1 } };
        await expect(iterativeStepProcessorHandler({ runtimeState: runtimeStateAttempt2 }, {} as any, {} as any)).rejects.toThrow(RetryableStepError);
        expect(runtimeStateAttempt2.stepRetryAttempts[failingStepId]).toBe(2);
        expect(mockedExecutionLogger.logStepExecution).toHaveBeenCalledWith(expect.objectContaining({ status: 'RETRYING_CONTENT', attemptNumber: 1 }));
        expect(mockedExecutionLogger.logStepExecution).toHaveBeenCalledWith(expect.objectContaining({ status: 'RETRYING_CONTENT', attemptNumber: 2 }));
        vi.clearAllMocks();
        const runtimeStateAttempt3 = { ...baseRuntimeState, stepRetryAttempts: { [failingStepId]: 2 } };
        const result3 = await iterativeStepProcessorHandler({ runtimeState: runtimeStateAttempt3 }, {} as any, {} as any) as ProcessorOutput;
        expect(result3.runtimeState.status).toBe('FAILED');
        expect(result3.runtimeState.currentStepInstanceId).toBeUndefined();
        expect(result3.runtimeState.errorInfo?.errorName).toBe('ContentBasedRetryableError');
        expect(mockedExecutionLogger.logStepExecution).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED', attemptNumber: 3 }));
    });

    it('should fail flow if outputValidation fails and there are no retries', async () => {
        const flowId = `output-validation-fail-flow-${uuidv4()}`;
        const validationStepId = 'validation_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: validationStepId,
            enableExecutionLogs: false,
            steps: {
                [validationStepId]: {
                    stepInstanceId: validationStepId, stepType: StepType.NO_OP, stepDefinitionId: 'system-noop',
                    outputValidation: { requiredFields: ['$.result.id'] } // Requires result.id to exist
                }
            }
        };
        await setupFlowInDB(flowDef);
        
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.NO_OP, handler: async () => ({ outputData: { result: { name: 'test' } } }) }));

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1, flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING', startTime: new Date().toISOString(), currentStepInstanceId: validationStepId,
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT: The promise should resolve, but the state should be FAILED.
        expect(result.runtimeState.status).toBe('FAILED');
        expect(result.runtimeState.errorInfo?.errorName).toBe('ContentBasedRetryableError');
        expect(result.runtimeState.errorInfo?.errorMessage).toContain('Required output field validation failed');
    });

    it('should fail flow if security validation fails', async () => {
        const flowId = `security-fail-flow-${uuidv4()}`;
        const securityStepId = 'security_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: securityStepId,
            enableExecutionLogs: false,
            steps: {
                [securityStepId]: {
                    stepInstanceId: securityStepId, stepType: StepType.LLM_INVOCATION,
                    stepDefinitionId: 'system-llm-invocation',
                    llmProvider: LLMProviderType.GEMINI,
                    modelId: 'gemini-pro',
                    securityValidatorConfig: { forbiddenStrings: ['secret'] }
                }
            }
        };
        await setupFlowInDB(flowDef);
        
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.LLM_INVOCATION, handler: async () => ({ outputData: { llm_response: 'the secret password is 123' } }) }));
        mockedValidateLlmOutput.mockRejectedValue(new SecurityViolationError('Output contained forbidden string: "secret"'));

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1, flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING', startTime: new Date().toISOString(), currentStepInstanceId: securityStepId,
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
        
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;

        expect(result.runtimeState.status).toBe('FAILED');
        expect(result.runtimeState.errorInfo?.errorName).toBe('SecurityViolationError');
    });

    it('should bootstrap logging if a flow fails with logging disabled', async () => {
        const flowId = `log-on-fail-flow-${uuidv4()}`;
        const failingStepId = 'failing_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: failingStepId,
            enableExecutionLogs: false,
            // NOTE: This test correctly simulates a configuration error.
            // The logs show `loadStepDefinition` failing because 'invalid' is not a real step ID.
            // This is the desired behavior for this test case.
            steps: { [failingStepId]: { stepInstanceId: failingStepId, stepType: StepType.DATA_LOAD, moduleIdentifier: 'invalid', stepDefinitionId: 'invalid' } }
        };
        await setupFlowInDB(flowDef);
    
        const failingHandler = vi.fn().mockRejectedValue(new Error("Module Error"));
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.DATA_LOAD, handler: failingHandler }));
    
        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: failingStepId,
                currentContextData: {},
                enableExecutionLogs: false, // Explicitly disabled
                stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
    
        // ACT 1: Simulate the step processor failing
        const ispResult = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;
        
        // Intermediate ASSERT: Ensure the ISP has failed before passing to finalizer
        expect(ispResult.runtimeState.status).toBe('FAILED');

        // ACT 2: Simulate SFN passing the failed state to the finalizer
        const finalizerInput: ProcessorInput = { runtimeState: ispResult.runtimeState };
        await finalizeFlowHandler(finalizerInput, {} as any, {} as any);
    
        // ASSERT
        expect(mockedExecutionLogger.createMetadataRecord).toHaveBeenCalledTimes(1);
        expect(mockedExecutionLogger.createMetadataRecord).toHaveBeenCalledWith(expect.objectContaining({
            enableExecutionLogs: true
        }));
        expect(mockedExecutionLogger.logStepExecution).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
    });
});
