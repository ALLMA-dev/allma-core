import {
  StepHandler,
  StepHandlerOutput,
  StepDefinition,
  GenerateArrayCustomConfigSchema as GenerateArrayInputSchema,
} from '@allma/core-types';

export const executeGenerateArrayTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
): Promise<StepHandlerOutput> => {
  const validation = GenerateArrayInputSchema.safeParse(stepInput);
  if (!validation.success) {
    throw new Error(`Invalid input for generate-array: ${validation.error.message}`);
  }
  
  const { count } = validation.data;
  const newArray = Array.from({ length: count }, (_, i) => i);
  
  return {
    outputData: {
        array: newArray,
    }
  };
};
