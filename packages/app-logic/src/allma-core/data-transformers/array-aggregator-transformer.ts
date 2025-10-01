import { z } from 'zod';
import { StepHandler, StepHandlerOutput, StepDefinition } from '@allma/core-types';
import { log_warn } from '@allma/core-sdk';

const ArrayAggregatorInputSchema = z.object({
  array: z.array(z.any()),
  path: z.string().optional().describe("A simple property name to extract numeric/boolean values from objects in the array."),
  operation: z.enum(['min', 'max', 'sum', 'avg']),
});

export const executeArrayAggregatorTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>, // This is the combined, hydrated input
): Promise<StepHandlerOutput> => {
  const validation = ArrayAggregatorInputSchema.safeParse(stepInput);
  if (!validation.success) {
    throw new Error(`Invalid input for system/array-aggregator: ${validation.error.message}`);
  }

  const { array, path, operation } = validation.data;

  if (array.length === 0) {
    return { outputData: { result: operation === 'sum' ? 0 : null } };
  }

  let values: (number | boolean)[] = [];
  if (path) {
    values = array
      .map(item => {
        // Handle non-object items gracefully
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return item[path];
        }
        return undefined;
      })
      .filter(value => value !== undefined) as (number | boolean)[];
  } else {
    // If no path, the array itself should contain the values
    values = array;
  }

  // Filter for numbers or booleans, and convert booleans to numbers (1/0)
  const numbers = values
    .map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
    .filter(v => typeof v === 'number' && isFinite(v)) as number[];

  if (numbers.length === 0) {
    log_warn('Array aggregator found no numbers to process.', { path });
    return { outputData: { result: operation === 'sum' ? 0 : null } };
  }

  let result: number | null = null;
  switch (operation) {
    case 'max':
      result = Math.max(...numbers);
      break;
    case 'min':
      result = Math.min(...numbers);
      break;
    case 'sum':
      result = numbers.reduce((acc, val) => acc + val, 0);
      break;
    case 'avg':
      result = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
      break;
  }

  return { outputData: { result: result } };
};
