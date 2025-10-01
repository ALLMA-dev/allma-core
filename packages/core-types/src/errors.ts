/**
 * Base class for custom errors, ensuring the error name is correctly propagated.
 */
export class BaseProcessingError extends Error {
  public details?: any;
  public originalError?: Error | undefined;

  constructor(message: string, name: string, details?: any, originalError?: Error) {
    super(message);
    this.name = name; // Crucial for Step Functions error matching
    this.details = details;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype); // Maintain prototype chain
  }
}

/**
 * An error for permanent, non-recoverable failures (e.g., configuration error).
 */
export const PERMANENT_STEP_ERROR_NAME = 'PermanentStepError';
export class PermanentStepError extends BaseProcessingError {
  constructor(message: string, details?: any, originalError?: Error) {
    super(message, PERMANENT_STEP_ERROR_NAME, details, originalError);
  }
}

/**
 * An error for temporary, potentially recoverable failures (e.g., a 5xx API response).
 */
export const TRANSIENT_STEP_ERROR_NAME = 'TransientStepError';
export class TransientStepError extends BaseProcessingError {
  constructor(message: string, details?: any, originalError?: Error) {
    super(message, TRANSIENT_STEP_ERROR_NAME, details, originalError);
  }
}

/**
 * An error specifically named to be caught by the Step Functions `Retry` mechanism.
 */
export const RETRYABLE_STEP_ERROR_NAME = 'RetryableStepError';
export class RetryableStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = RETRYABLE_STEP_ERROR_NAME;
  }
}

/**
 * An error for failures due to invalid content (e.g., malformed JSON) that might succeed on retry.
 */
export const CONTENT_BASED_RETRYABLE_ERROR_NAME = 'ContentBasedRetryableError';
export class ContentBasedRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = CONTENT_BASED_RETRYABLE_ERROR_NAME;
  }
}

/**
 * An error for JSON parsing issues.
 */
export class JsonParseError extends BaseProcessingError {
  constructor(message: string, details?: any, originalError?: Error) {
    super(message, 'JsonParseError', details, originalError);
  }
}

/**
 * Custom error for easy catching of security validation failures.
 */
export class SecurityViolationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SecurityViolationError';
    }
}