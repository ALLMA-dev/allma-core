import { JSONPath } from 'jsonpath-plus';
import { z } from 'zod';
import {
  LlmToolDeclaration,
  LlmToolDeclarationSchema,
  LlmToolChoice,
  LlmToolChoiceSchema,
  PermanentStepError,
} from '@allma/core-types';
import { log_debug, log_info, log_warn } from '@allma/core-sdk';

/**
 * Resolves tool declarations for an LLM_INVOCATION step with the following precedence:
 * 1. `staticList` (`stepDef.tools`): If present as a non-empty array, validated against {@link LlmToolDeclarationSchema}.
 * 2. `dynamicPath` (`stepDef.toolsPath`): JSONPath evaluated against context. If undefined, logs a warning and returns `[]`. Validated against {@link LlmToolDeclarationSchema}.
 * 3. `customConfigTools` (`customConfig?.tools`): Fallback check for legacy customConfig tools.
 *
 * Throws a {@link PermanentStepError} on validation failure.
 */
export function getToolsConfig(
  staticList: LlmToolDeclaration[] | undefined,
  dynamicPath: string | undefined,
  customConfigTools: unknown,
  context: Record<string, unknown>,
  correlationId?: string
): LlmToolDeclaration[] {
  if (staticList && Array.isArray(staticList) && staticList.length > 0) {
    const validation = z.array(LlmToolDeclarationSchema).safeParse(staticList);
    if (!validation.success) {
      throw new PermanentStepError(
        `Static tools definition is invalid: ${validation.error.message}`
      );
    }
    log_debug('Using static tools from step configuration.', { count: validation.data.length }, correlationId);
    return validation.data;
  }

  if (dynamicPath) {
    log_debug(`Resolving dynamic tools from path: ${dynamicPath}`, {}, correlationId);
    const value = JSONPath({ path: dynamicPath, json: context, wrap: false });
    if (value === undefined) {
      log_warn(`toolsPath '${dynamicPath}' resolved to undefined. No tools will be used.`, {}, correlationId);
      return [];
    }

    const validation = z.array(LlmToolDeclarationSchema).safeParse(value);
    if (!validation.success) {
      throw new PermanentStepError(
        `The data at toolsPath '${dynamicPath}' is not a valid array of tool declarations: ${validation.error.message}`
      );
    }
    log_info(`Resolved ${validation.data.length} dynamic tool declaration(s).`, {}, correlationId);
    return validation.data;
  }

  if (customConfigTools !== undefined && customConfigTools !== null && Array.isArray(customConfigTools)) {
    const validation = z.array(LlmToolDeclarationSchema).safeParse(customConfigTools);
    if (!validation.success) {
      throw new PermanentStepError(
        `Legacy customConfig.tools definition is invalid: ${validation.error.message}`
      );
    }
    log_debug('Using legacy customConfig.tools from step configuration.', { count: validation.data.length }, correlationId);
    return validation.data;
  }

  return [];
}

/**
 * Resolves tool choice configuration for an LLM_INVOCATION step from static or customConfig settings.
 *
 * Throws a {@link PermanentStepError} on validation failure.
 */
export function getToolChoiceConfig(
  staticToolChoice: LlmToolChoice | undefined,
  customConfigToolChoice: unknown,
  context?: Record<string, unknown>,
  correlationId?: string
): LlmToolChoice | undefined {
  const choice = staticToolChoice ?? customConfigToolChoice;

  if (choice !== undefined && choice !== null) {
    const validation = LlmToolChoiceSchema.safeParse(choice);
    if (!validation.success) {
      throw new PermanentStepError(
        `Tool choice configuration is invalid: ${validation.error.message}`
      );
    }
    log_debug('Using tool choice configuration.', { choice: validation.data }, correlationId);
    return validation.data;
  }

  return undefined;
}
