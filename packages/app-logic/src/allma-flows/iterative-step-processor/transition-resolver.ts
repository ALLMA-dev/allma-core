import {
    FlowRuntimeState,
    StepInstance,
    SfnActionType,
    FlowDefinition,
    StepType,
    TransitionEvaluationEvent,
} from '@allma/core-types';
import {
    log_info,
    log_error,
} from '@allma/core-sdk';
import { evaluateCondition } from '../../allma-core/utils/condition-evaluator.js';

/**
 * Determines the next step instance ID based on transition conditions and logs the evaluation.
 * This function now supports simple expression evaluation (e.g., "$.path > 10") in addition
 * to standard JSONPath truthiness checks by using a centralized evaluator.
 * @returns A promise that resolves to an object with the next step ID and details about the transition evaluation.
 */
export const resolveNextStep = async (
    stepInstanceConfig: StepInstance,
    runtimeState: FlowRuntimeState,
): Promise<{ nextStepId: string | undefined; transitionDetails: TransitionEvaluationEvent }> => {
    const correlationId = runtimeState.flowExecutionId;
    const currentStepId = stepInstanceConfig.stepInstanceId;

    // Create a combined context for evaluation to access root-level state properties.
    const evaluationContext = { ...runtimeState, ...runtimeState.currentContextData };

    if (stepInstanceConfig.transitions && stepInstanceConfig.transitions.length > 0) {
        for (const transition of stepInstanceConfig.transitions) {
            const { result: conditionMet, resolvedValue, events } = await evaluateCondition(
                transition.condition,
                evaluationContext,
                correlationId
            );
            
            log_info(`Transition condition '${transition.condition}' resolved to: ${conditionMet}`, { resolvedValue }, correlationId);
            
            if (conditionMet) {
                const nextStepId = transition.nextStepInstanceId;
                log_info(`Transition condition met for step '${currentStepId}'. Next step: '${nextStepId}'`, { condition: transition.condition, valueEvaluated: resolvedValue }, correlationId);
                return {
                    nextStepId,
                    transitionDetails: {
                        type: 'CONDITION',
                        condition: transition.condition,
                        resolvedValue: resolvedValue,
                        result: true,
                        chosenNextStepId: nextStepId,
                        mappingEvents: events.length > 0 ? events : undefined,
                    }
                };
            }
        }
    }

    if (stepInstanceConfig.defaultNextStepInstanceId) {
        const nextStepId = stepInstanceConfig.defaultNextStepInstanceId;
        log_info(`No transition condition met for step '${currentStepId}'. Using default next step: '${nextStepId}'`, {}, correlationId);
        return {
            nextStepId,
            transitionDetails: {
                type: 'DEFAULT',
                result: true,
                chosenNextStepId: nextStepId,
            }
        };
    }
    
    log_info(`No further transitions or default path from step '${currentStepId}'. Path has ended.`, {}, correlationId);
    return {
        nextStepId: undefined,
        transitionDetails: {
            type: 'END_OF_PATH',
            result: true, // Path ended as expected
        }
    };
};


/**
 * Determines the SFN action required for the *next* step in the flow.
 * @returns An object containing the SfnActionType and any necessary input for that action.
 */
export const determineNextSfnAction = (
    runtimeState: FlowRuntimeState,
    flowDef: FlowDefinition,
    correlationId: string,
): { sfnAction: SfnActionType, pollingTaskInput?: any } => {
    const nextStepId = runtimeState.currentStepInstanceId;
    if (!nextStepId) {
        return { sfnAction: SfnActionType.PROCESS_STEP }; // No next step, proceed to finalize
    }

    const nextStepConfig = flowDef.steps[nextStepId];
    if (!nextStepConfig) {
        log_error(`Next step instance '${nextStepId}' not found in flow definition.`, {}, correlationId);
        throw new Error(`Configuration for next step '${nextStepId}' not found.`);
    }

    const nextStepType = nextStepConfig.stepType;
    
    if (nextStepType === StepType.WAIT_FOR_EXTERNAL_EVENT) {
        return { sfnAction: SfnActionType.WAIT_FOR_EXTERNAL_EVENT };
    }

    if (nextStepType === StepType.POLL_EXTERNAL_API) {
        // ### FIX START ###
        // The pollingTaskInput is now correctly constructed from the configuration
        // of the *next* step (the polling step itself).
        return {
            sfnAction: SfnActionType.POLL_EXTERNAL_API,
            pollingTaskInput: {
                apiCallDefinition: (nextStepConfig as any).apiCallDefinition,
                pollingConfig: (nextStepConfig as any).pollingConfig,
                exitConditions: (nextStepConfig as any).exitConditions,
            }
        };
        // ### FIX END ###
    }
    
    return { sfnAction: SfnActionType.PROCESS_STEP };
};