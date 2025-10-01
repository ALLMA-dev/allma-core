// packages/allma-app-logic/src/allma-core/utils/template-renderer.ts
import { log_error, log_warn } from '@allma/core-sdk';
import { JSONPath } from 'jsonpath-plus';
import { TemplateService } from '../template-service.js';

/**
 * A centralized, robust, and recursive utility to render template strings within a given object.
 * This function supports both pure JSONPath (`$.some.value`) for direct value extraction and
 * strings containing Handlebars templates (`prefix-{{some.value}}`) for interpolation.
 *
 * @param obj The object containing potential templates to process.
 * @param contextData The data context to use for rendering templates.
 * @param correlationId Optional correlation ID for logging.
 * @returns A new object with all template strings rendered.
 */
export function renderNestedTemplates(obj: Record<string, any> | undefined, contextData: Record<string, any>, correlationId?: string): Record<string, any> | undefined {
  if (!obj) return undefined;

  const renderedObj: Record<string, any> = {};
  const templateService = TemplateService.getInstance();

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Rule: If a string starts with '$.' and contains no '{{', treat it as a pure JSONPath.
      if (value.startsWith('$.') && !value.includes('{{')) {
        try {
          const resolved = JSONPath({ path: value, json: contextData, wrap: false });
          if (resolved === undefined) {
            log_warn(`JSONPath '${value}' for key '${key}' resolved to undefined. This may cause issues.`, {}, correlationId);
          }
          renderedObj[key] = resolved;
        } catch (e) {
          const errorMessage = `Failed to resolve JSONPath '${value}' for key '${key}'`;
          log_error(errorMessage, { error: (e as Error).message }, correlationId);
          throw new Error(errorMessage);
        }
      } else if (value.includes('{{')) {
        // Otherwise, if it contains '{{', treat it as a Handlebars template for interpolation.
        renderedObj[key] = templateService.render(value, contextData);
      } else {
        // It's just a literal string.
        renderedObj[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse for nested objects.
      renderedObj[key] = renderNestedTemplates(value, contextData, correlationId);
    } else {
      // Pass through other types (numbers, booleans, arrays, null) as-is.
      renderedObj[key] = value;
    }
  }
  return renderedObj;
}
