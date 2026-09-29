import { ENV_VAR_NAMES, LogRedactionConfigSchema } from '@allma/core-types';
import { StageConfig } from '../config/stack-config.js';

/**
 * Serialises `stageConfig.logging.redaction` into the env var the core-sdk logger reads at load time.
 * Parsing here makes an invalid pattern fail synth instead of masking every runtime log line.
 */
export const logRedactionEnv = (stageConfig: StageConfig): Record<string, string> => {
  const { redaction } = stageConfig.logging;
  if (!redaction) return {};
  return { [ENV_VAR_NAMES.LOG_REDACTION_CONFIG]: JSON.stringify(LogRedactionConfigSchema.parse(redaction)) };
};
