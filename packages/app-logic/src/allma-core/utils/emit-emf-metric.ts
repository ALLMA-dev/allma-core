export interface EmfMetricParams {
  namespace: string;
  metricName: string;
  value: number;
  /** Low-cardinality dimensions only (e.g. flowId, stepInstanceId). Values must be strings. */
  dimensions: Record<string, string>;
  /** High-cardinality identifiers and extra context (e.g. flowExecutionId) — never a dimension. */
  fields?: Record<string, unknown>;
}

/**
 * Writes a single CloudWatch Embedded Metric Format (EMF) line to stdout.
 *
 * EMF lets CloudWatch extract a metric from a structured log line with no PutMetricData call,
 * so this is IAM-free and performs no AWS mutation. Keep `dimensions` low-cardinality: every
 * distinct dimension-value combination is a separate CloudWatch metric.
 */
export const emitEmfMetric = ({ namespace, metricName, value, dimensions, fields }: EmfMetricParams): void => {
  const payload = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: [Object.keys(dimensions)],
          Metrics: [{ Name: metricName }],
        },
      ],
    },
    ...dimensions,
    [metricName]: value,
    ...fields,
  };

  console.log(JSON.stringify(payload));
};
