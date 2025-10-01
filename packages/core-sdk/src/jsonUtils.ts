import * as jsonrepairModule from 'jsonrepair';
import { log_debug, log_warn } from './logger.js';
import { JsonParseError } from '@allma/core-types';

const repairFunc = jsonrepairModule.jsonrepair || jsonrepairModule;

/**
 * Extracts a potential JSON string from a raw LLM response,
 * attempts to repair it, and then parses it.
 * Handles common issues like markdown code fences and leading/trailing text.
 *
 * @param inputText The raw string response (for example from the LLM).
 * @param correlationId Optional correlation ID for logging.
 * @returns The parsed JSON object.
 * @throws JsonParseError if parsing fails after repair attempts.
 */
export function extractAndParseJson(inputText: string, correlationId?: string): any {
    if (typeof repairFunc !== 'function') {
        // This will give a very clear error in logs if the import fails.
        throw new JsonParseError('Critical error: jsonrepair function could not be imported correctly.');
    }

    if (!inputText || inputText.trim() === "") {
        log_warn('Cannot parse empty or whitespace-only LLM response.', { correlationId });
        throw new JsonParseError("Raw LLM response is empty or whitespace.", { rawResponse: inputText });
    }

    let textToParse = inputText.trim();

    // Attempt to remove markdown fences (```json ... ``` or ``` ... ```)
    // Regex to capture content within ```json ... ``` or ``` ... ```
    const markdownJsonRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
    const markdownMatch = textToParse.match(markdownJsonRegex);
    if (markdownMatch && markdownMatch[1]) {
        textToParse = markdownMatch[1].trim();
        log_debug('Removed markdown fences from LLM response.', { correlationId });
    }

    // Fallback: if no markdown, try to find the outermost JSON structure.
    // This helps if there's leading/trailing text without markdown.
    if (!(markdownMatch && markdownMatch[1])) {
        const firstBrace = textToParse.indexOf('{');
        const firstBracket = textToParse.indexOf('[');
        let startIndex = -1;

        if (firstBrace !== -1 && firstBracket !== -1) {
            startIndex = Math.min(firstBrace, firstBracket);
        } else if (firstBrace !== -1) {
            startIndex = firstBrace;
        } else if (firstBracket !== -1) {
            startIndex = firstBracket;
        }

        if (startIndex !== -1) {
            const lastBrace = textToParse.lastIndexOf('}');
            const lastBracket = textToParse.lastIndexOf(']');
            let endIndex = -1;

            if (lastBrace !== -1 && lastBracket !== -1) {
                endIndex = Math.max(lastBrace, lastBracket);
            } else if (lastBrace !== -1) {
                endIndex = lastBrace;
            } else if (lastBracket !== -1) {
                endIndex = lastBracket;
            }
            
            if (endIndex > startIndex) {
                const extractedSubstring = textToParse.substring(startIndex, endIndex + 1);
                // Basic sanity check: does the substring look plausible?
                // (e.g. starts with { and ends with } or starts with [ and ends with ])
                const firstChar = extractedSubstring.charAt(0);
                const lastChar = extractedSubstring.charAt(extractedSubstring.length - 1);
                if ((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']')) {
                    textToParse = extractedSubstring;
                    log_debug('Extracted potential JSON substring from surrounding text.', { correlationId });
                } else {
                    log_debug('Found start/end braces/brackets, but they did not form a plausible outer pair. Will attempt repair on mostly original text.', { correlationId });
                }
            } else {
                 log_debug('Could not determine a clear JSON substring from braces/brackets. Attempting repair on (markdown-stripped) text.', { correlationId });
            }
        } else {
            log_debug('No braces or brackets found. Attempting repair on (markdown-stripped) text.', { correlationId });
        }
    }


    try {
        const repairedJsonString = repairFunc(textToParse);
        //const repairedJsonString = JSON.parse(textToParse);
        log_debug('LLM response string repaired, attempting JSON.parse.', { correlationId });
        return JSON.parse(repairedJsonString);
    } catch (error: any) {
        log_warn('Failed to parse JSON even after attempting extraction and repair.', {
            originalTextPreview: inputText.substring(0, 2000),
            processedTextPreview: textToParse.substring(0, 2000),
            error: error.message,
            correlationId
        });
        throw new JsonParseError(`Failed to parse JSON object from LLM response: ${error.message}`, {
            rawResponseSnippet: inputText.substring(0, 2000),
            attemptedToParseSnippet: textToParse.substring(0,2000)
        }, error);
    }
}

/**
 * A safer version of extractAndParseJson that returns null on failure instead of throwing.
 * @param rawLlmResponse The raw string response from the LLM.
 * @param correlationId Optional correlation ID for logging.
 * @returns The parsed JSON object or null if parsing fails.
 */
export function extractAndParseJsonSafe(rawLlmResponse: string, correlationId?: string): any | null {
    try {
        return extractAndParseJson(rawLlmResponse, correlationId);
    } catch (e) {
        // Error is already logged by extractAndParseJson
        return null;
    }
}