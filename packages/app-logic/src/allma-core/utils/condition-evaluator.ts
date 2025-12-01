import { log_warn } from '@allma/core-sdk';
import { getSmartValueByJsonPath } from '../data-mapper.js';
import { MappingEvent } from '@allma/core-types';

/**
 * Evaluates a single, simple condition.
 * This can be either a JSONPath for a truthiness check, or a simple comparison
 * of the form `JSONPath operator literal`.
 * @private
 */
const evaluateSingleCondition = async (
    condition: string,
    context: Record<string, any>,
    correlationId?: string,
): Promise<{ result: boolean; resolvedValue: any; events: MappingEvent[] }> => {
    let conditionMet = false;
    let resolvedValue: any;
    const allEvents: MappingEvent[] = [];

    // Regular expression to parse simple comparison expressions.
    // It captures: 1=JSONPath, 2=operator, 3=literal value.
    // Updated to include 'undefined' explicitly as a literal.
    const expressionRegex = /^\s*(\$\..+?)\s*([<>=!]{1,3})\s*(true|false|null|undefined|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*$/;
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
        else if (literalValueStr === 'undefined') compareValue = undefined;
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

/**
 * Evaluates a condition string, supporting simple expressions, JSONPath truthiness checks,
 * and compound conditions joined by '&&' (AND) and '||' (OR).
 * This function respects operator precedence: OR has lower precedence than AND, so the expression
 * is split by '||' first, and then each segment is evaluated as an AND chain.
 *
 * @param condition The condition string (e.g., "$.path.value > 10 || $.path.value == null").
 * @param context The data context against which the condition is evaluated.
 * @param correlationId For logging.
 * @returns A promise that resolves to an object containing the boolean result and any mapping events.
 */
export const evaluateCondition = async (
    condition: string,
    context: Record<string, any>,
    correlationId?: string,
): Promise<{ result: boolean; resolvedValue: any; events: MappingEvent[] }> => {
    
    // 1. Split by OR (||) first to handle logical disjunction.
    const orSegments = condition.split('||').map(c => c.trim());
    
    const allEvents: MappingEvent[] = [];
    const collectedResolvedValues: any[] = [];

    for (const orSegment of orSegments) {
        // 2. For each OR segment, split by AND (&&) to handle logical conjunction.
        const andSegments = orSegment.split('&&').map(c => c.trim());
        
        let isAndChainTrue = true;
        const currentChainValues: any[] = [];

        for (const subCondition of andSegments) {
            // Evaluate the atomic condition
            const { result: subResult, resolvedValue, events } = await evaluateSingleCondition(subCondition, context, correlationId);
            
            allEvents.push(...events);
            currentChainValues.push(resolvedValue);

            if (!subResult) {
                // Short-circuit: One false in an AND chain makes the chain false.
                isAndChainTrue = false;
                break;
            }
        }
        
        collectedResolvedValues.push(currentChainValues);

        if (isAndChainTrue) {
            // Short-circuit: One true chain in an OR expression makes the whole expression true.
            return { result: true, resolvedValue: collectedResolvedValues, events: allEvents };
        }
    }

    // If we exit the loop, no OR segment evaluated to true.
    return { result: false, resolvedValue: collectedResolvedValues, events: allEvents };
};