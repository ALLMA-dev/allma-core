import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// SUT (System Under Test)
import { handler as iterativeStepProcessorHandler } from '../../../src/allma-flows/iterative-step-processor';

// Mocks
import * as stepHandlerRegistry from '../../../src/allma-core/step-handlers/handler-registry';

// Test Helpers
import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';

// Types
import {
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  StepType,
} from '@allma/core-types';

// Mock the logger client to prevent actual lambda invocations
vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the handler registry to allow spying and custom implementations per test
vi.mock('../../../src/allma-core/step-handlers/handler-registry');

const mockedGetStepHandler = vi.mocked(stepHandlerRegistry.getStepHandler);
let originalRegistry: typeof stepHandlerRegistry;

describe('Integration: Iterative Step Processor - Linear and Conditional Flows', () => {

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

    it('should execute a simple linear flow successfully', async () => {
        // ARRANGE
        const flowId = `linear-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'step1',
            enableExecutionLogs: false,
            steps: {
                'step1': {
                    stepInstanceId: 'step1', stepType: StepType.DATA_TRANSFORMATION,
                    moduleIdentifier: 'system/compose-object-from-input',
                    inputMappings: { 'message': '$.initial.greeting' },
                    literals: { 'step_name': 'step1' },
                    outputMappings: { '$.steps_output.step1_result': '$.' },
                    defaultNextStepInstanceId: 'step2',
                },
                'step2': {
                    stepInstanceId: 'step2', stepType: StepType.NO_OP,
                    defaultNextStepInstanceId: 'step3',
                    // No output mappings -> will use default: '$.steps_output.step2'
                },
                'step3': {
                    stepInstanceId: 'step3', stepType: StepType.END_FLOW,
                }
            }
        };
        await setupFlowInDB(flowDef);
    
        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`,
                status: 'RUNNING', startTime: new Date().toISOString(),
                currentStepInstanceId: 'step1',
                currentContextData: { 
                    initial: { greeting: 'hello' },
                    steps_output: {} // Initialize to match state from initialize-flow
                },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
    
        // ACT & ASSERT - Step 1: Execute DATA_TRANSFORMATION
        const result1 = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;
        expect(result1.runtimeState.currentStepInstanceId).toBe('step2');
        expect(result1.runtimeState.currentContextData.steps_output.step1_result).toEqual({
            message: 'hello',
            step_name: 'step1'
        });
    
        // ACT & ASSERT - Step 2: Execute NO_OP
        const input2: ProcessorInput = { runtimeState: result1.runtimeState };
        const result2 = await iterativeStepProcessorHandler(input2, {} as any, {} as any) as ProcessorOutput;
        expect(result2.runtimeState.currentStepInstanceId).toBe('step3');
        expect(result2.runtimeState.currentContextData.steps_output.step2.message).toContain('executed successfully');
        
        // ACT & ASSERT - Step 3: Execute END_FLOW
        const input3: ProcessorInput = { runtimeState: result2.runtimeState };
        const result3 = await iterativeStepProcessorHandler(input3, {} as any, {} as any) as ProcessorOutput;
        expect(result3.runtimeState.currentStepInstanceId).toBeUndefined();
        expect(result3.runtimeState.status).toBe('COMPLETED');
    });

    it('should follow a conditional transition based on context data', async () => {
        // ARRANGE
        const flowId = `conditional-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'start',
            enableExecutionLogs: false,
            steps: {
                'start': {
                    stepInstanceId: 'start', stepType: StepType.NO_OP,
                    transitions: [
                        { condition: "$.input.value > 10", nextStepInstanceId: 'greater_than_10' }
                    ],
                    defaultNextStepInstanceId: 'less_than_or_equal_10'
                },
                'greater_than_10': { stepInstanceId: 'greater_than_10', stepType: StepType.END_FLOW },
                'less_than_or_equal_10': { stepInstanceId: 'less_than_or_equal_10', stepType: StepType.END_FLOW },
            }
        };
        await setupFlowInDB(flowDef);
    
        const baseInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'start',
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
    
        // ACT 1 - Test the "greater than 10" path
        const input1: ProcessorInput = { runtimeState: { ...baseInput.runtimeState, currentContextData: { input: { value: 15 } } } };
        const result1 = await iterativeStepProcessorHandler(input1, {} as any, {} as any) as ProcessorOutput;
    
        // ASSERT 1
        expect(result1.runtimeState.currentStepInstanceId).toBe('greater_than_10');
    
        // ACT 2 - Test the default "less than or equal to 10" path
        const input2: ProcessorInput = { runtimeState: { ...baseInput.runtimeState, currentContextData: { input: { value: 5 } } } };
        const result2 = await iterativeStepProcessorHandler(input2, {} as any, {} as any) as ProcessorOutput;
    
        // ASSERT 2
        expect(result2.runtimeState.currentStepInstanceId).toBe('less_than_or_equal_10');
    });
});
