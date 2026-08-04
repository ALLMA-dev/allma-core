import {
  StepHandler,
  StepHandlerOutput,
  StepDefinition,
  FlattenArrayCustomConfigSchema as FlattenArrayInputSchema,
} from '@allma/core-types';

export const executeFlattenArrayTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>, // This is the combined, hydrated input
): Promise<StepHandlerOutput> => {
  const validation = FlattenArrayInputSchema.safeParse(stepInput);
  if (!validation.success) {
    throw new Error(`Invalid input for system/flatten-array: ${validation.error.message}`);
  }

  const { array: inputArray, path } = validation.data;
  
  let flattenedArray: any[];

  // logic to handle both property extraction (map) and nested array flattening (flatMap).
  if (path) {
    // If a path is provided, iterate over the input array. For each object, extract the
    // value at the given path. If that value is an array, flatten it into the
    // result. Otherwise, add the value directly. This supports both use cases.
    flattenedArray = [];
    for (const item of inputArray) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const value = item[path];
        // Ensure we don't add null or undefined to the array.
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              // If the property is an array, flatten it into the result (flatMap behavior).
              flattenedArray.push(...value);
            } else {
              // If the property is a single item (string, number, object), add it directly (map behavior).
              flattenedArray.push(value);
            }
        }
      }
    }
  } else {
    // If no path is provided, assume the input is an array of arrays and flatten it.
    flattenedArray = inputArray.flat();
  }

  return {
    outputData: {
      result: flattenedArray
    }
  };
};
