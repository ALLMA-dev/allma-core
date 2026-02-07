import { Anomaly } from '@optiroq/types';
import { log_info, log_error } from '@allma/core-sdk';

interface StepInput {
  normalizedData: Record<string, any>;
  anomalyResults: Anomaly[];
  correlationId: string;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Calculates a quantitative risk score for a quote based on anomalies and other factors.
 * @param event The input event from Allma.
 * @returns An object containing the calculated risk score.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ riskScore: number }> => {
  const { normalizedData, anomalyResults, correlationId } = event.stepInput;
  log_info('Calculating risk score...', { correlationId });

  try {
    let score = 0;

    // 1. Score based on anomaly severity
    anomalyResults.forEach(anomaly => {
      switch (anomaly.originalSeverity) {
        case 'High':
          score += 30;
          break;
        case 'Medium':
          score += 10;
          break;
        case 'Low':
          score += 2;
          break;
      }
    });

    // 2. Score based on quality score (example)
    const qualityScore = normalizedData.esgData?.qualityScore;
    if (typeof qualityScore === 'number' && qualityScore < 80) {
      score += 15;
    }
    
    // 3. Score based on lead time (example, assumes a target is available)
    // For this example, we'll use a placeholder logic.
    // In a real implementation, a target lead time would be fetched from the RFQ.
    const leadTimeSOP = normalizedData.quoteData?.['leadTimeSOP']?.value;
    if (typeof leadTimeSOP === 'string' && parseInt(leadTimeSOP, 10) > 20) { // e.g., target is 20 weeks
        score += 20;
    }
    
    // 4. Normalize score to 0-100 scale (clamping at 100)
    const finalScore = Math.min(score, 100);

    log_info(`Calculated risk score: ${finalScore}`, { correlationId });
    return { riskScore: finalScore };

  } catch (error) {
    log_error('Failed to calculate risk score', { correlationId, error });
    // Return a default high risk score on failure to be safe
    return { riskScore: 100 };
  }
};