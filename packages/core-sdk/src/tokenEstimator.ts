import { log_error, log_warn, log_info } from './logger.js';
import { Tiktoken } from "js-tiktoken";
import o200k_base from "js-tiktoken/ranks/o200k_base";

// Cache the Tiktoken instance globally within this module
let tokenizerInstance: Tiktoken | null = null;
let tokenizerInitialized = false;

function getTokenizer(correlationId?: string): Tiktoken {
    if (!tokenizerInstance) {
        if (tokenizerInitialized) { // It failed before, don't retry endlessly in one invocation
            log_error('Tokenizer previously failed to initialize. Using fallback.', {}, correlationId);
            throw new Error('Tokenizer previously failed to initialize.'); // Forces fallback in estimateTokens
        }
        try {
            tokenizerInstance = new Tiktoken(o200k_base);
            tokenizerInitialized = true; // Mark as initialized (or attempted)
            log_info('Tiktoken (o200k_base) tokenizer initialized successfully.', {}, correlationId || 'TOKENIZER_INIT');
        } catch (e: any) {
            tokenizerInitialized = true; // Mark as attempted to prevent re-init loops
            log_error('Failed to initialize tiktoken tokenizer (o200k_base). Subsequent calls will use fallback.', {
                error: e.message,
            }, correlationId || 'TOKENIZER_INIT_ERROR');
            throw new Error(`Critical: Failed to initialize tokenizer: ${e.message}`);
        }
    }
    return tokenizerInstance;
}

export function estimateTokens(text: string | null | undefined, correlationId?: string): number {
    if (!text) return 0;
    try {
        const enc = getTokenizer(correlationId);
        return enc.encode(text).length;
    } catch (e: any) {
        log_warn('Failed to estimate tokens using tiktoken. Falling back to character-based estimation. This is highly inaccurate.', {
            error: e.message,
            textSnippet: text.substring(0, 100),
            correlationId
        });
        // Fallback: very rough estimate (char count / 4)
        return Math.ceil(text.length / 4);
    }
}