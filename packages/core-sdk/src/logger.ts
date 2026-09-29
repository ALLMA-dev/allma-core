import { ENV_VAR_NAMES, LogLevel, LogRedactionConfigSchema, type LogRedactionConfig } from '@allma/core-types';

const LOG_LEVELS = Object.values(LogLevel);

// Default to 'INFO' if LOG_LEVEL is not set or is invalid
let currentLogLevel: LogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || LogLevel.INFO;
if (!LOG_LEVELS.includes(currentLogLevel)) {
    console.log(`Invalid LOG_LEVEL: "${process.env.LOG_LEVEL}". Defaulting to INFO.`);
    currentLogLevel = LogLevel.INFO;
}
const LOG_LEVEL_NUMERIC = LOG_LEVELS.indexOf(currentLogLevel);

const REDACTOR_SLOT = Symbol.for('allma.core-sdk.logRedactor');
const REDACTION_FAILED = '[REDACTION_FAILED]';
const DEFAULT_REDACTION_REPLACEMENT = '[REDACTED]';

/**
 * Transforms a log value before it is written. Called once with the `details` object (must return a
 * plain object) and once with the `message` string (must return a string).
 */
export type LogRedactor = (value: unknown) => unknown;

const slot = globalThis as unknown as Record<symbol, LogRedactor | undefined>;

/**
 * Registers the process-wide redactor applied to every log line at every level; `undefined` clears it.
 * The redactor is stored on `globalThis`, so every copy of `@allma/core-sdk` in a bundle shares it.
 * If it throws or returns the wrong type, the line is written with `message` and `details` set to
 * `'[REDACTION_FAILED]'` and the raw values are dropped.
 */
export const setLogRedactor = (fn: LogRedactor | undefined): void => {
  slot[REDACTOR_SLOT] = fn;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Builds a redactor that replaces the value of every key named in `keys` (case-insensitive) and every
 * match of `patterns` (compiled with `gi`) inside strings with `replacement` (default `'[REDACTED]'`).
 * It recurses only into arrays and plain objects, so Dates, Errors and Buffers serialise as before.
 * Cycles become `'[Circular]'`. The input is never mutated.
 */
export const createKeyPatternRedactor = ({ keys, patterns, replacement = DEFAULT_REDACTION_REPLACEMENT }: LogRedactionConfig): LogRedactor => {
  const keySet = new Set(keys.map((key) => key.toLowerCase()));
  const regexes = patterns.map((pattern) => new RegExp(pattern, 'gi'));
  const walk = (value: unknown, ancestors: WeakSet<object>): unknown => {
    if (typeof value === 'string') return regexes.reduce((text, regex) => text.replace(regex, () => replacement), value);
    if (!Array.isArray(value) && !isPlainObject(value)) return value;
    if (ancestors.has(value)) return '[Circular]';
    ancestors.add(value);
    const result = Array.isArray(value)
      ? value.map((item) => walk(item, ancestors))
      : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, keySet.has(key.toLowerCase()) ? replacement : walk(item, ancestors)]));
    ancestors.delete(value);
    return result;
  };
  return (value) => walk(value, new WeakSet());
};

const redactEntry = (redactor: LogRedactor, level: LogLevel, message: string, details: object, correlationId: string, timestamp: string) => {
  const failed = { level, message: REDACTION_FAILED, correlationId, details: REDACTION_FAILED, timestamp };
  try {
    const redactedDetails = redactor(details);
    const redactedMessage = redactor(message);
    if (!isPlainObject(redactedDetails) || typeof redactedMessage !== 'string') return failed;
    return { level, message: redactedMessage, correlationId, ...redactedDetails, timestamp };
  } catch {
    return failed;
  }
};

const log = (level: LogLevel, message: string, details: object = {}, correlationId?: string) => {
  const messageLevelNumeric = LOG_LEVELS.indexOf(level);

  // Only log if the message's level is at or above the current log level
  if (messageLevelNumeric >= LOG_LEVEL_NUMERIC) {
    const timestamp = new Date().toISOString();
    const redactor = slot[REDACTOR_SLOT];
    const logEntry = redactor
      ? redactEntry(redactor, level, message, details, correlationId || 'N/A', timestamp)
      : {
          level: level,
          message,
          correlationId: correlationId || 'N/A',
          ...details,
          timestamp,
        };
    // Using console.log for all levels; CloudWatch will handle them as log events.
    console.log(JSON.stringify(logEntry));
  }
};

export const log_debug = (message: string, details: object = {}, correlationId?: string) => log(LogLevel.DEBUG, message, details, correlationId);
export const log_info = (message: string, details: object = {}, correlationId?: string) => log(LogLevel.INFO, message, details, correlationId);
export const log_warn = (message: string, details: object = {}, correlationId?: string) => log(LogLevel.WARN, message, details, correlationId);
export const log_error = (message: string, details: object = {}, correlationId?: string) => log(LogLevel.ERROR, message, details, correlationId);
export const log_critical = (message: string, details: object = {}, correlationId?: string) => log(LogLevel.CRITICAL, message, details, correlationId);

const registerRedactorFromEnv = () => {
  const rawConfig = process.env[ENV_VAR_NAMES.LOG_REDACTION_CONFIG];
  if (!rawConfig || slot[REDACTOR_SLOT]) return;
  let errorKind: string;
  try {
    const parsed = LogRedactionConfigSchema.safeParse(JSON.parse(rawConfig));
    if (parsed.success) {
      setLogRedactor(createKeyPatternRedactor(parsed.data));
      return;
    }
    errorKind = 'SchemaValidationError';
  } catch {
    errorKind = 'JsonParseError';
  }
  log_warn(`Invalid ${ENV_VAR_NAMES.LOG_REDACTION_CONFIG}; every log line will be masked.`, { errorKind });
  setLogRedactor(() => {
    throw new Error(`Invalid ${ENV_VAR_NAMES.LOG_REDACTION_CONFIG}`);
  });
};

registerRedactorFromEnv();
