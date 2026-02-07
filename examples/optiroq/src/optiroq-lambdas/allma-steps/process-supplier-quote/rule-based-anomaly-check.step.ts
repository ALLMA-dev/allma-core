import { Anomaly, AnomalySeverity, AnomalyType } from '@optiroq/types';
import { log_info } from '@allma/core-sdk';

interface StepInput {
  normalizedData: Record<string, any>;
  correlationId: string;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Performs deterministic, rule-based checks on normalized quote data to find anomalies.
 * @returns An object containing an array of found anomalies.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ anomalies: Partial<Anomaly>[] }> => {
  const { normalizedData, correlationId } = event.stepInput;
  log_info('Performing rule-based anomaly checks...', { correlationId });

  const anomalies: Partial<Anomaly>[] = [];
  
  // Rule 1: Check for excessive scrap ratio
  const grossWeight = normalizedData.grossWeight?.normalizedValue;
  const netWeight = normalizedData.netWeight?.normalizedValue;
  if (typeof grossWeight === 'number' && typeof netWeight === 'number' && grossWeight > 0) {
    const scrapRatio = (grossWeight - netWeight) / grossWeight;
    if (scrapRatio > 0.5) {
      anomalies.push({
        anomalyType: AnomalyType.INCONSISTENCY,
        originalSeverity: AnomalySeverity.MEDIUM,
        description: `Scrap ratio is unusually high at ${(scrapRatio * 100).toFixed(1)}%.`,
        details: { field: 'scrapRatio', value: scrapRatio, threshold: 0.5 },
      });
    }
  }
  
  // Rule 2: Check for missing tooling investment
  const toolingInvestment = normalizedData.toolingInvestment?.normalizedValue;
  if (toolingInvestment === 0 || toolingInvestment === undefined) {
      anomalies.push({
          anomalyType: AnomalyType.MISSING_DATA,
          originalSeverity: AnomalySeverity.HIGH,
          description: 'Tooling investment is missing or zero, which is unlikely.',
          details: { field: 'toolingInvestment', value: toolingInvestment },
      });
  }

  // Add more rules here as needed...

  log_info(`Found ${anomalies.length} rule-based anomalies.`, { correlationId });
  return { anomalies };
};