import { z } from 'zod';
import {
  FlowRuntimeState,
  PermanentStepError,
  StepDefinition,
  StepHandler,
  StepHandlerOutput,
} from '@allma/core-types';
import { log_error, log_info, log_debug } from '@allma/core-sdk';

// NEW: Schema for defining a mapping between a left and right key.
const JoinKeyMappingSchema = z.object({
  left: z.string().min(1, 'Left key name cannot be empty.'),
  right: z.string().min(1, 'Right key name cannot be empty.'),
});

// MODIFIED: The main input schema is updated to support both old and new key definitions.
const JoinDataInputSchema = z
  .object({
    left_source: z.any().describe('The first dataset to join. Provided via Input Mappings. Can be a JSON array or a raw CSV string.'),
    left_format: z.enum(['csv', 'json']).describe('The format of the left data source.'),
    right_source: z.any().describe('The second dataset to join. Provided via Input Mappings.'),
    right_format: z.enum(['csv', 'json']).describe('The format of the right data source.'),
    join_keys: z.array(z.string()).min(1).optional().describe('For simple joins. An array of column names to join on that are IDENTICAL in both datasets (e.g., ["user_id"]).'),
    key_mappings: z.array(JoinKeyMappingSchema).min(1).optional().describe('For advanced joins. An array of objects for mapping keys with DIFFERENT names (e.g., [{ "left": "manager_id", "right": "id" }]).'),
    join_type: z.enum(['inner', 'left', 'right', 'outer']).describe('The type of join to perform.'),
    right_select_columns: z.array(z.string()).optional().nullable().describe('Optional array of column names from the right dataset to include in the output. If empty, all non-key columns are included.'),
    output_format: z.enum(['csv', 'json']).describe('The desired format for the joined data.'),
  })
  // NEW: Refinement to ensure either `join_keys` or `key_mappings` is provided, but not both.
  .refine(
    (data) => !!data.join_keys !== !!data.key_mappings, // XOR logic
    {
      message: 'Exactly one of `join_keys` (for same-name keys) or `key_mappings` (for different-name keys) must be provided.',
      path: ['join_keys'], // Report error on one of the fields for clarity.
    },
  )
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
    const { join_type, right_select_columns } = config;

    // NEW: Normalize key configuration into a consistent [{ left, right }] format.
    const keyMappings: { left: string; right: string }[] = config.key_mappings
      ? config.key_mappings
      : config.join_keys!.map(key => ({ left: key, right: key }));

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

    // MODIFIED: Validate using the new keyMappings.
    for (const mapping of keyMappings) {
        if (!leftCols.includes(mapping.left)) throw new PermanentStepError(`Join key '${mapping.left}' not found in left data source columns.`);
        if (!rightCols.includes(mapping.right)) throw new PermanentStepError(`Join key '${mapping.right}' not found in right data source columns.`);
    }

    // MODIFIED: Use key mappings to determine which columns are keys.
    const leftJoinKeys = keyMappings.map(k => k.left);
    const rightJoinKeys = keyMappings.map(k => k.right);
    const allRightSideKeys = new Set(rightJoinKeys);

    const commonNonKeyCols = leftCols.filter(c => rightCols.includes(c) && !leftJoinKeys.includes(c) && !allRightSideKeys.has(c));
    const rightColsToSelect = (right_select_columns ?? rightCols).filter(c => !allRightSideKeys.has(c));

    // MODIFIED: Create a composite key for the map using the right-side key names.
    const createRightKey = (row: Record<string, any>) => rightJoinKeys.map(k => row[k]).join(' | ');
    const rightMap = new Map<string, Record<string, any>[]>();
    for (const row of rightData) {
        const key = createRightKey(row);
        if (!rightMap.has(key)) rightMap.set(key, []);
        rightMap.get(key)!.push(row);
    }

    const joinedData: Record<string, any>[] = [];
    const matchedRightKeys = new Set<string>();

    // MODIFIED: Create the lookup key using the left-side key names.
    const createLeftKey = (row: Record<string, any>) => leftJoinKeys.map(k => row[k]).join(' | ');

    for (const leftRow of leftData) {
        const key = createLeftKey(leftRow);
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

    // MODIFIED: Logic for unmatched right rows now correctly populates key columns.
    if (join_type === 'right' || join_type === 'outer') {
        for (const [key, rightRows] of rightMap.entries()) {
            if (!matchedRightKeys.has(key)) {
                for (const rightRow of rightRows) {
                    const mergedRow: Record<string, any> = {};
                    // Set all left-side columns to null.
                    for (const col of leftCols) {
                        mergedRow[commonNonKeyCols.includes(col) ? `${col}_left` : col] = null;
                    }
                    // Populate the key columns using the right row's values. The left side's key name is the final column name.
                    keyMappings.forEach(mapping => {
                        mergedRow[mapping.left] = rightRow[mapping.right];
                    });
                    // Populate the selected right-side columns.
                    for (const col of rightColsToSelect) {
                        mergedRow[commonNonKeyCols.includes(col) ? `${col}_right` : col] = rightRow[col];
                    }
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