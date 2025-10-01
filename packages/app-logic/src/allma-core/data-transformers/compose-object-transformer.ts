import { StepHandler, StepHandlerOutput, StepDefinition } from '@allma/core-types';

/**
 * A simple data transformation module that takes all key-value pairs from the
 * step's input and returns them as a single object in the output.
 *
 * @param stepInput The input data prepared by the data-mapper.
 * @returns A StepHandlerOutput where `outputData` is the same as `stepInput`.
 */
export const executeComposeObjectTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
): Promise<StepHandlerOutput> => {
  // This module's purpose is to simply package its input into a single output object.
  // This is useful for preparing a payload for a subsequent step, like SQS send.
  return {
    outputData: stepInput,
  };
};
