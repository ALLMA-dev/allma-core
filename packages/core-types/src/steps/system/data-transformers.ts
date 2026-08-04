import { z } from 'zod';

/**
 * Config schemas for the `DATA_TRANSFORMATION` system modules, centralized from
 * the runtime handlers in `allma-app-logic` so the importer, admin save API,
 * Visual Editor, and flow builder all validate them from one source of truth.
 *
 * Each schema describes the module's fully-resolved input (the merged
 * `customConfig` + input mappings + literals that the handler parses at
 * runtime). A field may legitimately be supplied via an input mapping rather
 * than statically in `customConfig`, which is why warn-mode lint treats a
 * missing field as advisory rather than fatal.
 */

/** Config for `system/array-aggregator`: reduce an array to min/max/sum/avg. */
export const ArrayAggregatorCustomConfigSchema = z.object({
  array: z.array(z.any()),
  path: z.string().optional().describe('A simple property name to extract numeric/boolean values from objects in the array.'),
  operation: z.enum(['min', 'max', 'sum', 'avg']),
});
export type ArrayAggregatorCustomConfig = z.infer<typeof ArrayAggregatorCustomConfigSchema>;

/**
 * Config for `system/compose-object-from-input`: the handler simply packages
 * its entire input into a single output object, so its config is intentionally
 * open-ended. Registered as a permissive record (rather than left opaque) so the
 * module is centrally classified; it accepts any object shape by design.
 */
export const ComposeObjectFromInputCustomConfigSchema = z.record(z.any());
export type ComposeObjectFromInputCustomConfig = z.infer<typeof ComposeObjectFromInputCustomConfigSchema>;

/** Config for `system/date-time-calculator`: add/subtract seconds from a base ISO timestamp. */
export const DateTimeCalculatorCustomConfigSchema = z.object({
  baseTime: z.string().datetime({ message: 'baseTime must be a valid ISO 8601 string.' }),
  offsetSeconds: z.number({ required_error: 'offsetSeconds (number) is required.' }),
  operation: z.enum(['add', 'subtract'], { required_error: "operation must be 'add' or 'subtract'." }),
});
export type DateTimeCalculatorCustomConfig = z.infer<typeof DateTimeCalculatorCustomConfigSchema>;

/** Config for `system/flatten-array`: flatten an array, optionally extracting a property first. */
export const FlattenArrayCustomConfigSchema = z.object({
  array: z.array(z.any()).describe('The array to process.'),
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      'If provided, the property name to extract from each object in the input array. If the extracted value is an array, its elements will be flattened into the result. If it is a single value, it will be added directly.',
    ),
});
export type FlattenArrayCustomConfig = z.infer<typeof FlattenArrayCustomConfigSchema>;

/** Config for `system/generate-array`: produce `[0..count-1]`. */
export const GenerateArrayCustomConfigSchema = z.object({
  count: z.number().int().min(0),
});
export type GenerateArrayCustomConfig = z.infer<typeof GenerateArrayCustomConfigSchema>;

/** A mapping between a left-dataset key and a differently-named right-dataset key. */
export const JoinKeyMappingSchema = z.object({
  left: z.string().min(1, 'Left key name cannot be empty.'),
  right: z.string().min(1, 'Right key name cannot be empty.'),
});
export type JoinKeyMapping = z.infer<typeof JoinKeyMappingSchema>;

/** Config for `system/join-data`: join two CSV/JSON datasets. */
export const JoinDataCustomConfigSchema = z
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
  .refine((data) => !!data.join_keys !== !!data.key_mappings, {
    message: 'Exactly one of `join_keys` (for same-name keys) or `key_mappings` (for different-name keys) must be provided.',
    path: ['join_keys'],
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
export type JoinDataCustomConfig = z.infer<typeof JoinDataCustomConfigSchema>;

/** Config for `system/generate-uuid`: a v4 UUID with optional prefix/suffix. */
export const GenerateUuidCustomConfigSchema = z.object({
  prefix: z.string().optional().default(''),
  suffix: z.string().optional().default(''),
});
export type GenerateUuidCustomConfig = z.infer<typeof GenerateUuidCustomConfigSchema>;
