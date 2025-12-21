import { z } from 'zod';
import { randomUUID } from 'crypto';
import { StepHandler, StepHandlerOutput, StepDefinition } from '@allma/core-types';

const GenerateUuidInputSchema = z.object({
  prefix: z.string().optional().default(''),
  suffix: z.string().optional().default(''),
});

/**
 * A data transformation module that generates a unique UUID (v4).
 * It can optionally prepend a prefix and append a suffix.
 *
 * @param stepInput The input object, which can contain 'prefix' and 'suffix'.
 * @returns A StepHandlerOutput containing the generated UUID string.
 */
export const executeGenerateUuidTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
): Promise<StepHandlerOutput> => {
  const validation = GenerateUuidInputSchema.safeParse(stepInput);
  if (!validation.success) {
    throw new Error(`Invalid input for system/generate-uuid: ${validation.error.message}`);
  }

  const { prefix, suffix } = validation.data;
  const uuid = randomUUID();
  const finalId = `${prefix}${uuid}${suffix}`;

  return {
    outputData: {
      uuid: finalId,
    },
  };
};