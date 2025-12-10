import { z } from 'zod';
import * as dfd from 'danfojs-node';
import { DataFrame } from 'danfojs-node';
import {
  FlowRuntimeState,
  PermanentStepError,
  StepDefinition,
  StepHandler,
  StepHandlerOutput,
} from '@allma/core-types';
import { log_error, log_info, log_debug } from '@allma/core-sdk';

/**
 * Zod schema for validating the input to the join-data module.
 * It ensures the data types match the specified format.
 */
const JoinDataInputSchema = z
  .object({
    left_source: z.any().describe('The first dataset to join. Provided via Input Mappings. Can be a JSON array or a raw CSV string.'),
    left_format: z.enum(['csv', 'json']).describe('The format of the left data source.'),
    right_source: z.any().describe('The second dataset to join. Provided via Input Mappings.'),
    right_format: z.enum(['csv', 'json']).describe('The format of the right data source.'),
    join_keys: z.array(z.string()).min(1, 'At least one join key is required.').describe('An array of column names to join on (e.g., ["user_id", "email"]).'),
    join_type: z.enum(['inner', 'left', 'right', 'outer']).describe('The type of join to perform.'),
    right_select_columns: z.array(z.string()).optional().nullable().describe('Optional array of column names from the right dataset to include in the output. If empty, all non-key columns are included.'),
    output_format: z.enum(['csv', 'json']).describe('The desired format for the joined data.'),
  })
  .refine(
    (data) => {
      if (data.left_format === 'csv') return typeof data.left_source === 'string';
      if (data.left_format === 'json') return Array.isArray(data.left_source);
      return false;
    },
    {
      message: 'left_source data type does not match left_format. Expected string for csv, array for json.',
      path: ['left_source'],
    },
  )
  .refine(
    (data) => {
      if (data.right_format === 'csv') return typeof data.right_source === 'string';
      if (data.right_format === 'json') return Array.isArray(data.right_source);
      return false;
    },
    {
      message: 'right_source data type does not match right_format. Expected string for csv, array for json.',
      path: ['right_source'],
    },
  );

/**
 * Loads data into a Danfo.js DataFrame from either a CSV string or a JSON array.
 */
const loadDataFrame = async (
  data: any,
  format: 'csv' | 'json',
  correlationId?: string,
): Promise<DataFrame> => {
  try {
    if (format === 'csv') {
      const df = await dfd.readCSV(Buffer.from(data as string));
      return new DataFrame(df);
    } else {
      // Assumes JSON is in "records" orientation (array of objects)
      return new DataFrame(data);
    }
  } catch (error: any) {
    log_error('Failed to load data into DataFrame.', { format, error: error.message }, correlationId);
    throw new PermanentStepError(`Failed to parse ${format.toUpperCase()} data: ${error.message}`);
  }
};

/**
 * A data transformation module that performs a join operation on two datasets.
 */
export const executeJoinDataTransformer: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  log_info('Executing join-data transformer.', {}, correlationId);
  log_debug('Received step input for join-data', { stepInput }, correlationId);

  const validation = JoinDataInputSchema.safeParse(stepInput);
  if (!validation.success) {
    log_error('Invalid input for system/join-data.', { errors: validation.error.flatten() }, correlationId);
    throw new PermanentStepError(`Invalid input for join-data: ${validation.error.message}`);
  }
  const config = validation.data;

  // 1. Load Data
  log_info('Loading left and right data sources into DataFrames.', {}, correlationId);
  const [df_left, df_right] = await Promise.all([
    loadDataFrame(config.left_source, config.left_format, correlationId),
    loadDataFrame(config.right_source, config.right_format, correlationId),
  ]);
  log_debug('DataFrames loaded.', { left_cols: df_left.columns, right_cols: df_right.columns }, correlationId);

  // 2. Validation
  for (const key of config.join_keys) {
    if (!df_left.columns.includes(key)) {
      throw new PermanentStepError(`Join key '${key}' not found in left data source columns.`);
    }
    if (!df_right.columns.includes(key)) {
      throw new PermanentStepError(`Join key '${key}' not found in right data source columns.`);
    }
  }

  if (config.right_select_columns) {
    for (const col of config.right_select_columns) {
      if (!df_right.columns.includes(col)) {
        throw new PermanentStepError(
          `Selected right column '${col}' not found in right data source columns.`,
        );
      }
    }
  }
  log_info('All join keys and selection columns are valid.', {}, correlationId);

  // 3. Join
  log_info(`Performing '${config.join_type}' join.`, { on: config.join_keys }, correlationId);
  const common_non_key_cols = df_left.columns.filter(
    (c: string) => df_right.columns.includes(c) && !config.join_keys.includes(c),
  );
  const merged_df = dfd.merge({
    left: df_left,
    right: df_right,
    on: config.join_keys,
    how: config.join_type,
    suffixes: ['_left', '_right'],
  });

  // 4. Column Selection
  const left_cols_final = df_left.columns.map((c: string) =>
    common_non_key_cols.includes(c) ? `${c}_left` : c,
  );

  const right_selectable =
    config.right_select_columns === null || config.right_select_columns === undefined
      ? df_right.columns
      : config.right_select_columns;

  const right_cols_final = right_selectable
    .filter((c: string) => !config.join_keys.includes(c))
    .map((c: string) => (common_non_key_cols.includes(c) ? `${c}_right` : c));

  const final_column_list = [...new Set([...left_cols_final, ...right_cols_final])];
  log_debug('Final columns to select after join.', { columns: final_column_list }, correlationId);

  const final_df = merged_df.loc({ columns: final_column_list });

  // 5. Format Output
  log_info(`Formatting output as ${config.output_format}.`, { rows: final_df.shape[0] }, correlationId);
  let result: string | Array<any>;
  if (config.output_format === 'csv') {
    result = dfd.toCSV(final_df, { header: true, index: false });
  } else {
    result = dfd.toJSON(final_df, { format: 'row' });
  }

  return {
    outputData: {
      result: result,
      rowCount: final_df.shape[0],
    },
  };
};