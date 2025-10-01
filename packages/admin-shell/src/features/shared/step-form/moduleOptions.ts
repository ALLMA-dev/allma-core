import { SYSTEM_STEP_DEFINITIONS, StepType } from '@allma/core-types';

/**
 * Helper to get UI options for the moduleIdentifier field based on step type.
 * It filters the central system definitions to find modules matching the given type.
 */
export const getModuleIdentifierOptionsForStepType = (stepType: StepType): { label: string; value: string }[] => {
  return SYSTEM_STEP_DEFINITIONS
    .filter(def => def.stepType === stepType && typeof def.moduleIdentifier === 'string')
    .map(def => ({ value: def.moduleIdentifier as string, label: def.name }));
};
