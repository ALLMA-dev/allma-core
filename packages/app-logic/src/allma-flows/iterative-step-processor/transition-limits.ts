import { FlowRuntimeState, StepInstance, PermanentStepError } from '@allma/core-types';
import { log_error, log_debug } from '@allma/core-sdk';

/**
 * Enforces execution limits on transitions to prevent infinite loops.
 * Modifies runtimeState.transitionCounts to track executions.
 * Throws a PermanentStepError if the limit is exceeded.
 */
export function enforceTransitionLimits(
    stepInstanceConfig: StepInstance,
    nextStepId: string | undefined,
    transitionDetails: any,
    runtimeState: FlowRuntimeState,
    correlationId: string
): void {
    if (!nextStepId || !transitionDetails) return;

    let maxTransitions = 0;
    let transitionKey = '';

    // Ensure transitionCounts exists in the state
    if (!runtimeState.transitionCounts) {
        runtimeState.transitionCounts = {};
    }

    if (transitionDetails.type === 'DEFAULT') {
        maxTransitions = stepInstanceConfig.defaultNextMaxTransitions ?? 5;
        transitionKey = `${stepInstanceConfig.stepInstanceId}_default`;
    } else if (transitionDetails.type === 'CONDITION') {
        // Find the exact transition configuration that was matched
        const matchedIndex = stepInstanceConfig.transitions?.findIndex(
            t => t.condition === transitionDetails.condition && t.nextStepInstanceId === nextStepId
        );
        
        if (matchedIndex !== undefined && matchedIndex !== -1) {
            const matchedTransition = stepInstanceConfig.transitions![matchedIndex];
            maxTransitions = matchedTransition.maxTransitions ?? 5;
            transitionKey = `${stepInstanceConfig.stepInstanceId}_transition_${matchedIndex}`;
        } else {
            // Fallback key if direct match fails
            maxTransitions = 5;
            transitionKey = `${stepInstanceConfig.stepInstanceId}_to_${nextStepId}`;
        }
    } else {
        // END_OF_PATH or other terminal events don't loop
        return;
    }

    // 0 means infinite, so we only enforce if > 0
    if (maxTransitions > 0) {
        const currentCount = runtimeState.transitionCounts[transitionKey] || 0;
        
        if (currentCount >= maxTransitions) {
            log_error(`Transition limit reached for step '${stepInstanceConfig.stepInstanceId}'. Limit: ${maxTransitions}`, { transitionKey, currentCount }, correlationId);
            
            // Mutate details for accurate execution logging
            transitionDetails.type = 'MAX_TRANSITIONS_REACHED';
            transitionDetails.chosenNextStepId = undefined;
            
            throw new PermanentStepError(`Infinite loop prevented: Transition limit of ${maxTransitions} reached for step '${stepInstanceConfig.stepInstanceId}'.`);
        }
        
        // Increment the execution counter
        runtimeState.transitionCounts[transitionKey] = currentCount + 1;
        log_debug(`Incremented transition count for '${transitionKey}'. Current count: ${currentCount + 1}/${maxTransitions}`, {}, correlationId);
    }
}