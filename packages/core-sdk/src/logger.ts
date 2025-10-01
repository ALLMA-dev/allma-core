import { LogLevel } from '@allma/core-types';

const LOG_LEVELS = Object.values(LogLevel);

// Default to 'INFO' if LOG_LEVEL is not set or is invalid
let currentLogLevel: LogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || LogLevel.INFO;
if (!LOG_LEVELS.includes(currentLogLevel)) {
    console.log(`Invalid LOG_LEVEL: "${process.env.LOG_LEVEL}". Defaulting to INFO.`);
    currentLogLevel = LogLevel.INFO;
}
const LOG_LEVEL_NUMERIC = LOG_LEVELS.indexOf(currentLogLevel);


const log = (level: LogLevel, message: string, details: object = {}, correlationId?: string) => {
  const messageLevelNumeric = LOG_LEVELS.indexOf(level);

  // Only log if the message's level is at or above the current log level
  if (messageLevelNumeric >= LOG_LEVEL_NUMERIC) {
    const timestamp = new Date().toISOString();
    const logEntry = {
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
