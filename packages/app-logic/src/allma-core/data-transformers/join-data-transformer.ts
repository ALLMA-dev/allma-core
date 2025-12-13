import { z } from 'zod';
import {
  FlowRuntimeState,
  PermanentStepError,
  StepDefinition,
  StepHandler,
  StepHandlerOutput,
} from '@allma/core-types';
import { log_error, log_info, log_debug } from '@allma/core-sdk';

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
 * Parses a single line of a CSV file, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') { // Escaped quote
                current += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

/**
 * Parses a CSV string into an array of objects.
 */
function parseCsv(csv: string): Record<string, any>[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = parseCsvLine(lines[i]);
        if (values.length === headers.length) {
            const obj: Record<string, any> = {};
            headers.forEach((header, j) => {
                obj[header] = values[j];
            });
            data.push(obj);
        }
    }
    return data;
}

/**
 * Converts an array of objects into a CSV string.
 */
function toCsv(data: Record<string, any>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    const rows = data.map(obj => {
        return headers.map(header => {
            const value = obj[header];
            if (value === null || value === undefined) return '';
            let strValue = String(value);
            if (/[",\n]/.test(strValue)) {
                strValue = `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
}

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
    const { join_keys, join_type, right_select_columns } = config;

    const leftData = config.left_format === 'csv' ? parseCsv(config.left_source) : config.left_source;
    const rightData = config.right_format === 'csv' ? parseCsv(config.right_source) : config.right_source;

    if (leftData.length === 0 && (join_type === 'inner' || join_type === 'left')) {
        return { outputData: { result: config.output_format === 'csv' ? '' : [], rowCount: 0 } };
    }
    if (rightData.length === 0 && (join_type === 'inner' || join_type === 'right')) {
        return { outputData: { result: config.output_format === 'csv' ? '' : [], rowCount: 0 } };
    }

    const leftCols = Object.keys(leftData[0] || {});
    const rightCols = Object.keys(rightData[0] || {});

    for (const key of join_keys) {
        if (!leftCols.includes(key)) throw new PermanentStepError(`Join key '${key}' not found in left data source columns.`);
        if (!rightCols.includes(key)) throw new PermanentStepError(`Join key '${key}' not found in right data source columns.`);
    }

    const commonNonKeyCols = leftCols.filter(c => rightCols.includes(c) && !join_keys.includes(c));
    const rightColsToSelect = (right_select_columns ?? rightCols).filter(c => !join_keys.includes(c));

    const createKey = (row: Record<string, any>) => join_keys.map(k => row[k]).join(' | ');
    const rightMap = new Map<string, Record<string, any>[]>();
    for (const row of rightData) {
        const key = createKey(row);
        if (!rightMap.has(key)) rightMap.set(key, []);
        rightMap.get(key)!.push(row);
    }

    const joinedData: Record<string, any>[] = [];
    const matchedRightKeys = new Set<string>();

    for (const leftRow of leftData) {
        const key = createKey(leftRow);
        const rightMatches = rightMap.get(key);

        if (rightMatches) {
            if (join_type !== 'right') matchedRightKeys.add(key);
            for (const rightRow of rightMatches) {
                const mergedRow: Record<string, any> = {};
                for (const col of leftCols) mergedRow[commonNonKeyCols.includes(col) ? `${col}_left` : col] = leftRow[col];
                for (const col of rightColsToSelect) mergedRow[commonNonKeyCols.includes(col) ? `${col}_right` : col] = rightRow[col];
                joinedData.push(mergedRow);
            }
        } else if (join_type === 'left' || join_type === 'outer') {
            const mergedRow: Record<string, any> = {};
            for (const col of leftCols) mergedRow[commonNonKeyCols.includes(col) ? `${col}_left` : col] = leftRow[col];
            for (const col of rightColsToSelect) mergedRow[commonNonKeyCols.includes(col) ? `${col}_right` : col] = null;
            joinedData.push(mergedRow);
        }
    }

    if (join_type === 'right' || join_type === 'outer') {
        for (const [key, rightRows] of rightMap.entries()) {
            if (!matchedRightKeys.has(key)) {
                for (const rightRow of rightRows) {
                    const mergedRow: Record<string, any> = {};
                    for (const col of leftCols) {
                        mergedRow[commonNonKeyCols.includes(col) ? `${col}_left` : col] = null;
                        if (join_keys.includes(col)) mergedRow[col] = rightRow[col];
                    }
                    for (const col of rightColsToSelect) mergedRow[commonNonKeyCols.includes(col) ? `${col}_right` : col] = rightRow[col];
                    joinedData.push(mergedRow);
                }
            }
        }
    }

    let result: string | Record<string, any>[];
    if (config.output_format === 'csv') {
        result = toCsv(joinedData);
    } else {
        result = joinedData;
    }

    return {
        outputData: {
            result: result,
            rowCount: joinedData.length,
        },
    };
};