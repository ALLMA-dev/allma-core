import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// SUT
import { handler as iterativeStepProcessorHandler } from '../../../src/allma-flows/iterative-step-processor';

// Mocks
import * as stepHandlerRegistry from '../../../src/allma-core/step-handlers/handler-registry';
import * as s3Utils from '@allma/core-sdk';

// Helpers
import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';

// Types
import {
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  StepType,
  StepHandler,
} from '@allma/core-types';

vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-core/step-handlers/handler-registry');
vi.mock('@allma/core-sdk', async (importOriginal) => {
    const original = await importOriginal<typeof s3Utils>();
    return {
        ...original,
        resolveS3Pointer: vi.fn(),
        offloadIfLarge: vi.fn((payload) => Promise.resolve(payload)), // Default mock passes through
    };
});

const mockedResolveS3Pointer = vi.mocked(s3Utils.resolveS3Pointer);
const mockedOffloadIfLarge = vi.mocked(s3Utils.offloadIfLarge);
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

describe('Integration: Iterative Step Processor - Data Handling', () => {

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
        mockedResolveS3Pointer.mockClear();
        mockedOffloadIfLarge.mockImplementation((payload) => Promise.resolve(payload));
    });

    it('should resolve S3 pointers within input mappings before step execution', async () => {
        // ARRANGE
        const flowId = `s3-hydrate-flow-${uuidv4()}`;
        const hydrationStepId = 'hydrate_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: hydrationStepId,
            enableExecutionLogs: false,
            steps: {
                [hydrationStepId]: {
                    stepInstanceId: hydrationStepId, stepType: StepType.DATA_TRANSFORMATION,
                    moduleIdentifier: 'system/compose-object-from-input',
                    inputMappings: { 'data': '$.s3_data_wrapper' }, 
                    defaultNextStepInstanceId: 'end_step',
                },
                'end_step': { stepInstanceId: 'end_step', stepType: StepType.END_FLOW }
            }
        };
        await setupFlowInDB(flowDef);

        const s3PointerMock = { bucket: 'test-bucket', key: 'test-key' };
        const resolvedData = { large_field: 'resolved content' };
        
        mockedResolveS3Pointer.mockResolvedValue(resolvedData);

        let capturedStepInput: Record<string, any> = {};
        const capturingHandler = vi.fn().mockImplementation(async (_def, input) => {
            capturedStepInput = input;
            return { outputData: { processed: true } };
        });
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.DATA_TRANSFORMATION, handler: capturingHandler }));

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: hydrationStepId,
                currentContextData: {
                    s3_data_wrapper: { _s3_output_pointer: s3PointerMock }
                },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT
        expect(mockedResolveS3Pointer).toHaveBeenCalledWith(s3PointerMock, expect.any(String));
        expect(capturingHandler).toHaveBeenCalledTimes(1);
        expect(capturedStepInput).toEqual({ data: resolvedData });
        expect(result.runtimeState.currentStepInstanceId).toBe('end_step');
    });

    it('should apply runtime overrides to a step configuration', async () => {
        // ARRANGE
        const flowId = `override-flow-${uuidv4()}`;
        const overrideStepId = 'override_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: overrideStepId,
            enableExecutionLogs: false,
            steps: {
                [overrideStepId]: {
                    stepInstanceId: overrideStepId, stepType: StepType.NO_OP,
                    stepDefinitionId: 'system-noop',
                    literals: { message: 'original' }
                }
            }
        };
        await setupFlowInDB(flowDef);

        let capturedStepInput: Record<string, any> = {};
        const capturingHandler = vi.fn().mockImplementation(async (_def, input) => {
            capturedStepInput = input;
            return { outputData: { from_handler: input } };
        });
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.NO_OP, handler: capturingHandler }));

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1, flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING', startTime: new Date().toISOString(), currentStepInstanceId: overrideStepId,
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                executionOverrides: {
                    stepOverrides: {
                        [overrideStepId]: {
                            literals: { message: 'overridden' } // Override the literal message
                        }
                    }
                },
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
        
        // ACT
        await iterativeStepProcessorHandler(initialInput, {} as any, {} as any);

        // ASSERT
        expect(capturingHandler).toHaveBeenCalledTimes(1);
        expect(capturedStepInput.message).toBe('overridden'); // The handler should receive the overridden value
    });

    it('should respect the disableS3Offload flag and not call offloadIfLarge', async () => {
        // ARRANGE
        const flowId = `disable-offload-flow-${uuidv4()}`;
        const stepId = 'large_output_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: stepId,
            enableExecutionLogs: false,
            steps: {
                [stepId]: {
                    stepInstanceId: stepId, stepType: StepType.NO_OP, stepDefinitionId: 'system-noop',
                    disableS3Offload: true // The flag to test
                }
            }
        };
        await setupFlowInDB(flowDef);

        // Mock the handler to return a potentially large payload
        mockedGetStepHandler.mockImplementation(createMockStepHandler({ type: StepType.NO_OP, handler: async () => ({ outputData: { big_data: 'a'.repeat(300 * 1024) } }) }));

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1, flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING', startTime: new Date().toISOString(), currentStepInstanceId: stepId,
                currentContextData: {}, enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };

        // ACT
        await iterativeStepProcessorHandler(initialInput, {} as any, {} as any);

        // ASSERT
        expect(mockedOffloadIfLarge).not.toHaveBeenCalled();
    });
});
