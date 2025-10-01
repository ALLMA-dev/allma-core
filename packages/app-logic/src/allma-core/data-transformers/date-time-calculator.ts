import { z } from 'zod';
import { StepHandler, StepHandlerOutput, StepDefinition } from '@allma/core-types';
import { log_error } from '@allma/core-sdk';

/**
 * Zod schema for validating the input to the date-time-calculator module.
 */
const DateTimeCalculatorInputSchema = z.object({
  baseTime: z.string().datetime({ message: "baseTime must be a valid ISO 8601 string." }),
  offsetSeconds: z.number({ required_error: "offsetSeconds (number) is required." }),
  operation: z.enum(['add', 'subtract'], { required_error: "operation must be 'add' or 'subtract'." }),
});

/**
 * A data transformation module that adds or subtracts a specified number of seconds
 * from a base timestamp.
 *
 * @param stepInput The input object containing baseTime, offsetSeconds, and operation.
 * @returns A StepHandlerOutput containing the calculated ISO 8601 timestamp string.
 */
export const executeDateTimeCalculator: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
): Promise<StepHandlerOutput> => {
  // 1. Validate the combined input from mappings and literals.
  const validation = DateTimeCalculatorInputSchema.safeParse(stepInput);
  if (!validation.success) {
    const errorMsg = `Invalid input for system/date-time-calculator`;
    // Log the detailed validation error for easier debugging.
    log_error(errorMsg, { errors: validation.error.flatten(), receivedInput: stepInput });
    // Throw a clear error to fail the step.
    throw new Error(`${errorMsg}: ${validation.error.message}`);
  }

  const { baseTime, offsetSeconds, operation } = validation.data;

  // 2. Perform the date calculation.
  const baseDate = new Date(baseTime);
  const offsetMilliseconds = offsetSeconds * 1000;
  
  let resultTimestamp: number;
  if (operation === 'subtract') {
    resultTimestamp = baseDate.getTime() - offsetMilliseconds;
  } else { // operation === 'add'
    resultTimestamp = baseDate.getTime() + offsetMilliseconds;
  }
  
  const resultDate = new Date(resultTimestamp);
  const resultIsoString = resultDate.toISOString();

  // 3. Return the result. The output mapping in the flow will place this
  //    string into the desired location in the context.
  return {
    outputData: {
      result: resultIsoString,
    },
  };
};
