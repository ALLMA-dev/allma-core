import { z } from 'zod';

/**
 * Aggregated statistics for a single step type within a time range.
 *
 * Counts are derived from terminal step-execution events only (COMPLETED + FAILED), so a
 * step that is retried and then completes is counted once. `failCount` is the subset of
 * `count` that ended in FAILED. `avgDurationMs` averages `durationMs` over completed events.
 * Token totals are populated for AI step types (e.g. LLM_INVOCATION); zero otherwise.
 */
export const StepTypeBucketSchema = z.object({
  stepType: z.string(),
  count: z.number().int(),
  failCount: z.number().int(),
  avgDurationMs: z.number(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
});
export type StepTypeBucket = z.infer<typeof StepTypeBucketSchema>;

/**
 * Aggregated step statistics for a single flow, with a per-step-type breakdown.
 */
export const FlowStepBucketSchema = z.object({
  flowDefinitionId: z.string(),
  count: z.number().int(),
  failCount: z.number().int(),
  byStepType: z.array(StepTypeBucketSchema),
});
export type FlowStepBucket = z.infer<typeof FlowStepBucketSchema>;

/**
 * A single point in a time-bucketed series (per-hour or per-day). `bucketStart` is the ISO
 * timestamp of the start of the bucket (UTC); `count` is the number of step executions in it.
 */
export const StepTimeBucketSchema = z.object({
  bucketStart: z.string().datetime(),
  count: z.number().int(),
});
export type StepTimeBucket = z.infer<typeof StepTimeBucketSchema>;

/**
 * Aggregated step statistics for one time window (e.g. last 24h or last 7d).
 */
export const StepStatsRangeSchema = z.object({
  totalSteps: z.number().int(),
  byStepType: z.array(StepTypeBucketSchema),
  byFlow: z.array(FlowStepBucketSchema),
});
export type StepStatsRange = z.infer<typeof StepStatsRangeSchema>;

/**
 * The main response for the step-statistics API.
 *
 * `last24Hours` / `last7Days` give summary breakdowns by step type and by flow. `perHour`
 * (over the last 24h) and `perDay` (over the last 7d) give the time-distribution series used
 * to spot peaks; when the request carries a `?stepType=` (and optional `?flowDefinitionId=`)
 * filter, these series and the summaries are scoped to that filter.
 */
export const StepStatsResponseSchema = z.object({
  filterStepType: z.string().optional(),
  filterFlowDefinitionId: z.string().optional(),
  last24Hours: StepStatsRangeSchema,
  last7Days: StepStatsRangeSchema,
  perHour: z.array(StepTimeBucketSchema),
  perDay: z.array(StepTimeBucketSchema),
});
export type StepStatsResponse = z.infer<typeof StepStatsResponseSchema>;
