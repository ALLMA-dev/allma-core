import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// SUT
import { handler as iterativeStepProcessorHandler } from '../../../src/allma-flows/iterative-step-processor';

// Mocks
import * as stepHandlerRegistry from '../../../src/allma-core/step-handlers/handler-registry';

// Helpers
import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';

// Types
import {
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  StepType,
  SfnActionType,
  StepHandler,
  HttpMethod,
} from '@allma/core-types';

vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-core/step-handlers/handler-registry');

const mockedGetStepHandler = vi.mocked(stepHandlerRegistry.getStepHandler);
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

describe('Integration: Iterative Step Processor - Async Steps', () => {

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
    });

    it('should return WAIT_FOR_EXTERNAL_EVENT action if next step is async wait', async () => {
        // ARRANGE
        const flowId = `wait-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'setup_step',
            enableExecutionLogs: false,
            steps: {
                'setup_step': {
                    stepInstanceId: 'setup_step', stepType: StepType.NO_OP, stepDefinitionId: 'system-noop',
                    defaultNextStepInstanceId: 'wait_step',
                },
                'wait_step': {
                    stepInstanceId: 'wait_step', stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
                    stepDefinitionId: 'system-wait-for-external-event',
                    correlationKeyTemplate: 'test-key',
                },
            }
        };
        await setupFlowInDB(flowDef);

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'setup_step',
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        const result1 = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT
        expect(result1.runtimeState.currentStepInstanceId).toBe('wait_step');
        expect(result1.sfnAction).toBe(SfnActionType.WAIT_FOR_EXTERNAL_EVENT);
        expect(result1.pollingTaskInput).toBeUndefined();
    });
    
    it('should return POLL_EXTERNAL_API action with specialized input if next step is polling', async () => {
        // ARRANGE
        const flowId = `poll-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'prep_poll_step',
            enableExecutionLogs: false,
            steps: {
                'prep_poll_step': {
                    stepInstanceId: 'prep_poll_step', stepType: StepType.NO_OP, stepDefinitionId: 'system-noop',
                    defaultNextStepInstanceId: 'poll_step',
                },
                'poll_step': {
                    stepInstanceId: 'poll_step', stepType: StepType.POLL_EXTERNAL_API,
                    stepDefinitionId: 'system-poll-external-api',
                    moduleIdentifier: 'system/poll-external-api',
                    name: 'Poll External API', // Add name to bypass merge logic
                    apiCallDefinition: {
                        apiUrlTemplate: { template: 'http://test.com' },
                        apiHttpMethod: HttpMethod.GET,
                        apiStaticHeaders: {},
                    },
                    pollingConfig: {
                        intervalSeconds: 10,
                        maxAttempts: 5,
                    },
                    exitConditions: {
                        successCondition: '$.status == "COMPLETE"',
                        failureCondition: '$.status == "FAILED"',
                    }
                },
            }
        };
        await setupFlowInDB(flowDef);

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'prep_poll_step',
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        const result1 = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT
        expect(result1.runtimeState.currentStepInstanceId).toBe('poll_step');
        expect(result1.sfnAction).toBe(SfnActionType.POLL_EXTERNAL_API);
        expect(result1.pollingTaskInput).toEqual({
            apiCallDefinition: {
                apiUrlTemplate: { template: 'http://test.com' },
                apiHttpMethod: HttpMethod.GET,
                apiStaticHeaders: {},
            },
            pollingConfig: {
                intervalSeconds: 10,
                maxAttempts: 5,
            },
            exitConditions: {
                successCondition: '$.status == "COMPLETE"',
                failureCondition: '$.status == "FAILED"',
            }
        });
    });

    it('should correctly handle async resume with a resumePayload', async () => {
        // ARRANGE
        const flowId = `resume-flow-${uuidv4()}`;
        const waitStepId = 'wait_for_input';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: waitStepId,
            enableExecutionLogs: false,
            steps: {
                [waitStepId]: {
                    stepInstanceId: waitStepId,
                    stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
                    stepDefinitionId: 'system-wait-for-external-event',
                    correlationKeyTemplate: 'test-key',
                    outputMappings: { '$.user_response': '$.response_text' },
                    defaultNextStepInstanceId: 'final_step',
                },
                'final_step': {
                    stepInstanceId: 'final_step',
                    stepType: StepType.END_FLOW,
                },
            }
        };
        await setupFlowInDB(flowDef);

        const resumeInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId,
                flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: waitStepId, // The flow is paused at this step
                currentContextData: { existing_data: 123 },
                enableExecutionLogs: false,
                stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            },
            resumePayload: { // This is the payload sent from the /resume API
                response_text: 'This is the user input',
                some_other_data: 'ignore',
            }
        };

        // ACT
        const result = await iterativeStepProcessorHandler(resumeInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT
        // 1. The context should be updated based on the outputMappings of the wait step.
        expect(result.runtimeState.currentContextData.user_response).toBe('This is the user input');
        expect(result.runtimeState.currentContextData.existing_data).toBe(123);
        
        // 2. The flow should have transitioned to and executed the final END_FLOW step,
        // resulting in a completed status and no next step.
        expect(result.runtimeState.status).toBe('COMPLETED');
        expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
        expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
    });
});
