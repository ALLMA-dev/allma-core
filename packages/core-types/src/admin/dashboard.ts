import { z } from 'zod';

/**
 * A minimal summary of a failed execution for display on the dashboard.
 */
export const RecentExecutionSummarySchema = z.object({
  flowExecutionId: z.string().uuid(),
  flowDefinitionId: z.string(),
  flowDefinitionVersion: z.number().int(),
  startTime: z.string().datetime(),
  errorName: z.string(),
});
export type RecentExecutionSummary = z.infer<typeof RecentExecutionSummarySchema>;

/**
 * A breakdown of execution counts by their final status.
 */
export const StatusBreakdownSchema = z.object({
  COMPLETED: z.number().int(),
  FAILED: z.number().int(),
  RUNNING: z.number().int(),
  TIMED_OUT: z.number().int(),
  CANCELLED: z.number().int(),
});
export type StatusBreakdown = z.infer<typeof StatusBreakdownSchema>;

/**
 * A collection of statistics for a specific time range.
 */
export const TimeRangeStatSchema = z.object({
  totalExecutions: z.number().int(),
  statusBreakdown: StatusBreakdownSchema,
  averageDurationMs: z.number(),
});
export type TimeRangeStat = z.infer<typeof TimeRangeStatSchema>;

/**
 * The main data structure for the dashboard API response.
 */
export const DashboardStatsSchema = z.object({
  last24Hours: TimeRangeStatSchema,
  last7Days: TimeRangeStatSchema,
  recentFailures: z.array(RecentExecutionSummarySchema),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;