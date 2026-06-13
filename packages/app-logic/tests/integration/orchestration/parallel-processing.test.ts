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
  SfnActionType,
  AggregationStrategy,
} from '@allma/core-types';

vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-core/step-handlers/handler-registry');
// Only `resolveS3Pointer` is overridden; the real `offloadIfLarge` (and everything else) is
// preserved so the in-memory/aggregation tests below keep their original behavior.
vi.mock('@allma/core-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof s3Utils>();
  return {
    ...original,
    resolveS3Pointer: vi.fn(),
  };
});

const mockedResolveS3Pointer = vi.mocked(s3Utils.resolveS3Pointer);
const mockedGetStepHandler = vi.mocked(stepHandlerRegistry.getStepHandler);
let originalRegistry: typeof stepHandlerRegistry;

describe('Integration: Iterative Step Processor - Parallel Processing', () => {

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
        mockedResolveS3Pointer.mockReset();
    });

    it('should correctly prepare for a parallel fork (in-memory)', async () => {
        // ARRANGE
        const flowId = `fork-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 'fork_step',
            enableExecutionLogs: false,
            steps: {
                'fork_step': {
                    stepInstanceId: 'fork_step', stepType: StepType.PARALLEL_FORK_MANAGER,
                    itemsPath: '$.items', // Iterate over the 'items' array
                    parallelBranches: [{
                        branchId: 'process_item_branch',
                        stepInstanceId: 'process_item_step', // Each item will be processed by this step
                    }],
                    aggregationConfig: { strategy: AggregationStrategy.COLLECT_ARRAY, failOnBranchError: false }
                },
                'process_item_step': { // This step definition is available to be used by the branch
                    stepInstanceId: 'process_item_step', stepType: StepType.DATA_TRANSFORMATION,
                    moduleIdentifier: 'system/compose-object-from-input',
                },
            }
        };
        await setupFlowInDB(flowDef);
    
        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 'fork_step',
                currentContextData: { items: [{ id: 1 }, { id: 2 }] },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            }
        };
    
        // ACT
        const result = await iterativeStepProcessorHandler(initialInput, {} as any, {} as any) as ProcessorOutput;
    
        // ASSERT
        expect(result.sfnAction).toBe(SfnActionType.PARALLEL_FORK);
        expect(result.parallelForkInput).toBeDefined();
        expect(result.parallelForkInput?.branchesToExecute).toHaveLength(2);
    
        const firstBranchPayload = result.parallelForkInput!.branchesToExecute[0];
        expect(firstBranchPayload.branchId).toBe('process_item_branch');
        expect(firstBranchPayload.branchInput.currentItem).toEqual({ id: 1 });
        expect(firstBranchPayload.branchDefinition.stepInstanceId).toBe('process_item_step');

        const secondBranchPayload = result.parallelForkInput!.branchesToExecute[1];
        expect(secondBranchPayload.branchInput.currentItem).toEqual({ id: 2 });
    });

    it('should correctly aggregate results from a parallel fork', async () => {
        // ARRANGE
        const flowId = `agg-flow-${uuidv4()}`;
        const aggregationStepId = 'agg_step';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: aggregationStepId,
            enableExecutionLogs: false,
            steps: {
                [aggregationStepId]: {
                    stepInstanceId: aggregationStepId, stepType: StepType.PARALLEL_FORK_MANAGER,
                    outputMappings: { '$.results.all_items': '$.aggregatedData' },
                    defaultNextStepInstanceId: 'final_step',
                    itemsPath: '$.dummy',
                    parallelBranches: [{
                        branchId: 'dummy_branch',
                        stepInstanceId: 'final_step'
                    }],
                    aggregationConfig: { strategy: AggregationStrategy.COLLECT_ARRAY, failOnBranchError: false }
                },
                'final_step': { stepInstanceId: 'final_step', stepType: StepType.END_FLOW }
            }
        };
        await setupFlowInDB(flowDef);
        
        const aggregationInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: aggregationStepId,
                currentContextData: { some_initial_data: true },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            },
            parallelAggregateInput: {
                originalStepInstanceId: aggregationStepId,
                branchOutputs: [
                    { branchId: 'b1', output: { processed: 'item_A' } },
                    { branchId: 'b2', output: { processed: 'item_B' } },
                    { branchId: 'b3', error: { errorName: 'BranchFail', errorMessage: 'Something went wrong', isRetryable: false } },
                ],
                aggregationConfig: {
                    strategy: AggregationStrategy.COLLECT_ARRAY,
                    failOnBranchError: false,
                }
            }
        };
        
        // ACT
        const result = await iterativeStepProcessorHandler(aggregationInput, {} as any, {} as any) as ProcessorOutput;
    
        // ASSERT
        expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
        expect(result.runtimeState.currentStepInstanceId).toBe('final_step');
        
        const aggregatedData = result.runtimeState.currentContextData.results.all_items;
        expect(aggregatedData).toHaveLength(3);
        expect(aggregatedData).toContainEqual({ processed: 'item_A' });
        expect(aggregatedData).toContainEqual({ processed: 'item_B' });
        expect(aggregatedData).toContainEqual(
            expect.objectContaining({
                branchId: 'b3',
                error: expect.any(Object),
            })
        );
    });

    it('should fail the flow if aggregation encounters branch error and failOnBranchError is true', async () => {
        // ARRANGE
        const flowId = `agg-fail-flow-${uuidv4()}`;
        const aggregationStepId = 'agg_step_fail';
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: aggregationStepId,
            enableExecutionLogs: false,
            steps: {
                [aggregationStepId]: {
                    stepInstanceId: aggregationStepId, stepType: StepType.PARALLEL_FORK_MANAGER,
                    outputMappings: { '$.results.all_items': '$.aggregatedData' },
                    defaultNextStepInstanceId: 'final_step',
                    itemsPath: '$.dummy',
                    parallelBranches: [{
                        branchId: 'dummy_branch',
                        stepInstanceId: 'final_step'
                    }],
                    aggregationConfig: {
                        strategy: AggregationStrategy.COLLECT_ARRAY,
                        failOnBranchError: true,
                    }
                },
                'final_step': { stepInstanceId: 'final_step', stepType: StepType.END_FLOW }
            }
        };
        await setupFlowInDB(flowDef);
        
        const aggregationInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: aggregationStepId,
                currentContextData: { some_initial_data: true },
                enableExecutionLogs: false, stepRetryAttempts: {},
                _internal: {
                    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} }
                }
            },
            parallelAggregateInput: {
                originalStepInstanceId: aggregationStepId,
                branchOutputs: [
                    { branchId: 'b1', output: { processed: 'item_A' } },
                    { branchId: 'b2', error: { errorName: 'BranchFail', errorMessage: 'Critical branch error', isRetryable: false } },
                ],
                aggregationConfig: {
                    strategy: AggregationStrategy.COLLECT_ARRAY,
                    failOnBranchError: true, 
                }
            }
        };

        // ACT
        const result = await iterativeStepProcessorHandler(aggregationInput, {} as any, {} as any) as ProcessorOutput;

        // ASSERT
        expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
        expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
        expect(result.runtimeState.status).toBe('FAILED');
        expect(result.runtimeState.errorInfo).toBeDefined();
        expect(result.runtimeState.errorInfo?.errorName).toBe('ParallelBranchExecutionError');
        expect(result.runtimeState.currentContextData.results).toBeUndefined(); // Output mapping should not run
    });

    it('should hydrate an S3 pointer at itemsPath and fork in-memory over the resolved items', async () => {
        // ARRANGE
        // Regression coverage for the redesign (commit 9e6b2ad) in which an `itemsPath` that
        // resolves to an S3 pointer is HYDRATED (its contents are read into memory) and then
        // iterated, rather than being handed to a Distributed Map as a pre-existing manifest.
        const flowId = `s3-fork-flow-${uuidv4()}`;
        const flowDef: FlowDefinition = {
            id: flowId, version: 1, isPublished: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            startStepInstanceId: 's3_fork_step',
            enableExecutionLogs: false,
            steps: {
                's3_fork_step': {
                    stepInstanceId: 's3_fork_step', stepType: StepType.PARALLEL_FORK_MANAGER,
                    itemsPath: '$.s3_manifest_wrapper', // Path to the S3 pointer wrapper
                    parallelBranches: [{ branchId: 'process_s3_item', stepInstanceId: 'process_item' }],
                    aggregationConfig: { strategy: AggregationStrategy.COLLECT_ARRAY, failOnBranchError: false }
                },
                'process_item': { stepInstanceId: 'process_item', stepType: StepType.NO_OP, stepDefinitionId: 'system-noop' },
            }
        };
        await setupFlowInDB(flowDef);

        const s3Pointer = { bucket: 'manifest-bucket', key: 'manifests/items.jsonl' };
        const resolvedItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
        mockedResolveS3Pointer.mockResolvedValue(resolvedItems);

        const initialInput: ProcessorInput = {
            runtimeState: {
                flowDefinitionId: flowId, flowDefinitionVersion: 1,
                flowExecutionId: `exec-${uuidv4()}`, status: 'RUNNING',
                startTime: new Date().toISOString(),
                currentStepInstanceId: 's3_fork_step',
                currentContextData: {
                    s3_manifest_wrapper: { _s3_output_pointer: s3Pointer }
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
        // The pointer must have been hydrated (read into memory) rather than used directly.
        expect(mockedResolveS3Pointer).toHaveBeenCalled();
        expect(mockedResolveS3Pointer.mock.calls[0][0]).toEqual(s3Pointer);

        // The hydrated array is small, so it forks in-memory rather than via a Distributed Map.
        expect(result.sfnAction).toBe(SfnActionType.PARALLEL_FORK);
        expect(result.s3ItemReader).toBeUndefined();
        expect(result.parallelForkInput?.branchesToExecute).toHaveLength(3);
        expect(result.parallelForkInput?.branchesToExecute[0].branchInput.currentItem).toEqual({ id: 1 });
        expect(result.parallelForkInput?.branchesToExecute[2].branchInput.currentItem).toEqual({ id: 3 });
        expect(result.parallelForkInput?.originalStepInstanceId).toBe('s3_fork_step');
    });
});
