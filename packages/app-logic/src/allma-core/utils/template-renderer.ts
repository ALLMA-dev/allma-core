import { log_error, log_warn, isObject } from '@allma/core-sdk';
import { JSONPath } from 'jsonpath-plus';
import { TemplateService } from '../template-service.js';

/**
 * A centralized, robust, and recursive utility to render template strings within a given object.
 * This function is defined before its export to allow for mutual recursion with `renderNestedTemplates`.
 *
 * It follows a sequential, two-pass process for each string:
 * 1. **Handlebars Pass:** Renders any `{{...}}` expressions.
 * 2. **JSONPath Pass:** Checks if the entire resulting string is a JSONPath expression (e.g., `$.path.to.value`)
 *    and, if so, resolves it against the context.
 *
 * This process is recursive to handle complex cases where a resolved value may itself be another template.
 *
 * @param value The value to process (can be any type).
 * @param contextData The data context to use for rendering templates and resolving paths.
 * @param correlationId Optional correlation ID for logging.
 * @returns The final, rendered value.
 */
function renderValue(value: any, contextData: Record<string, any>, correlationId?: string): any {
    // For non-string values, recurse into arrays/objects or return primitives as is.
    if (typeof value !== 'string') {
        if (Array.isArray(value)) {
            return value.map(item => renderValue(item, contextData, correlationId));
        }
        if (isObject(value)) {
            return renderNestedTemplates(value as Record<string, any>, contextData, correlationId);
        }
        return value; // Primitives like numbers, booleans, null
    }

    // It's a string, so apply transformations.
    let processedValue: string = value;
    const templateService = TemplateService.getInstance();

    // Pass 1: Render any Handlebars templates within the string.
    // This resolves `{{...}}` placeholders.
    if (processedValue.includes('{{')) {
        processedValue = templateService.render(processedValue, contextData);
    }
    
    // Pass 2: Check if the *entire resulting string* is a JSONPath expression.
    // This handles cases where a Handlebars template returns a JSONPath (e.g., {{jsonPathForUser}} -> "$.user.name")
    // or the original value was a pure JSONPath. The regex `^\$\..*$` is a simple but effective check.
    if (/^\$\..*$/.test(processedValue)) {
        try {
            const resolved = JSONPath({ path: processedValue, json: contextData, wrap: false });
            
            if (resolved === undefined) {
                log_warn(`JSONPath '${processedValue}' (from original value: '${value}') resolved to undefined.`, {}, correlationId);
            }

            // The result of the JSONPath might itself be another template string that needs rendering.
            // We recurse, but prevent infinite loops if a path resolves to itself.
            if (typeof resolved === 'string' && resolved !== processedValue) {
                return renderValue(resolved, contextData, correlationId);
            }
            
            return resolved;

        } catch (e) {
            // It looked like a JSONPath but failed to parse. This is an ambiguous case.
            // We'll log a warning and return the string as-is, assuming it was meant to be a literal.
            log_warn(`'${processedValue}' looks like a JSONPath but failed to resolve. Treating as literal.`, { originalValue: value, error: (e as Error).message }, correlationId);
            return processedValue;
        }
    }

    // If it wasn't a JSONPath after potential rendering, return the processed string.
    return processedValue;
}

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
  
  for (const [key, value] of Object.entries(obj)) {
    renderedObj[key] = renderValue(value, contextData, correlationId);
  }
  return renderedObj;
}