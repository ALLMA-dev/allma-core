import { log_warn } from '@allma/core-sdk';
import { getSmartValueByJsonPath } from '../data-mapper.js';
import { MappingEvent } from '@allma/core-types';

/**
 * Evaluates a condition string, supporting simple expressions and JSONPath truthiness checks.
 * This is an async function because it depends on the S3-aware getSmartValueByJsonPath.
 * @param condition The condition string (e.g., "$.path.value > 10" or "$.some.flag").
 * @param context The data context against which the condition is evaluated.
 * @param correlationId For logging.
 * @returns A promise that resolves to an object containing the boolean result and any mapping events.
 */
export const evaluateCondition = async (
    condition: string,
    context: Record<string, any>,
    correlationId?: string,
): Promise<{ result: boolean; resolvedValue: any; events: MappingEvent[] }> => {
    let conditionMet = false;
    let resolvedValue: any;
    const allEvents: MappingEvent[] = [];

    // Regular expression to parse simple comparison expressions.
    // It captures: 1=JSONPath, 2=operator, 3=literal value.
    const expressionRegex = /^\s*(\$\..+?)\s*([<>=!]{1,3})\s*(true|false|null|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*$/;
    const match = condition.match(expressionRegex);

    if (match) {
        const [, jsonPath, operator, literalValueStr] = match;
        // Resolve the value from the context using the smart getter.
        const { value: pathValue, events } = await getSmartValueByJsonPath(jsonPath, context, correlationId);
        resolvedValue = pathValue;
        allEvents.push(...events);

        // Parse the literal value from the regex match.
        let compareValue: any;
        if (literalValueStr === 'true') compareValue = true;
        else if (literalValueStr === 'false') compareValue = false;
        else if (literalValueStr === 'null') compareValue = null;
        else if (!isNaN(Number(literalValueStr))) compareValue = Number(literalValueStr);
        else compareValue = literalValueStr.slice(1, -1); // Unquote the string literal

        // Perform the comparison based on the operator.
        switch (operator) {
            case '>': conditionMet = pathValue > compareValue; break;
            case '<': conditionMet = pathValue < compareValue; break;
            case '>=': conditionMet = pathValue >= compareValue; break;
            case '<=': conditionMet = pathValue <= compareValue; break;
            case '==': case '=': conditionMet = pathValue == compareValue; break; // Loose equality
            case '===': conditionMet = pathValue === compareValue; break; // Strict equality
            case '!=': conditionMet = pathValue != compareValue; break;
            case '!==': conditionMet = pathValue !== compareValue; break;
            default:
                log_warn(`Unsupported operator '${operator}' in condition. Evaluating to false.`, { condition }, correlationId);
                conditionMet = false;
        }
    } else {
        // If it's not a simple expression, treat it as a JSONPath to be checked for truthiness.
        const { value, events } = await getSmartValueByJsonPath(condition, context, correlationId);
        resolvedValue = value;
        allEvents.push(...events);

        // For filter expressions like $[?(@.a==1)], the result is an array.
        // An empty array should be treated as falsy.
        if (Array.isArray(value)) {
            conditionMet = value.length > 0;
        } else {
            // Standard JavaScript truthiness for other types (null, undefined, 0, "", false are falsy).
            conditionMet = !!value;
        }
    }

    return { result: conditionMet, resolvedValue, events: allEvents };
};