import { StepHandler, StepHandlerOutput, StepDefinition } from '@allma/core-types';
import { z } from 'zod';

const GenerateArrayInputSchema = z.object({
  count: z.number().int().min(0),
});

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
