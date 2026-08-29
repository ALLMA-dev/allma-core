import {
  PermanentStepError,
  TransientStepError,
  RetryableStepError,
  ContentBasedRetryableError,
  SecurityViolationError,
} from '@allma/core-types';

export const KNOWN_RETRYABLE_ERROR_NAMES: ReadonlySet<string> = new Set([
  'TransientStepError',
  'RetryableStepError',
  'ContentBasedRetryableError',
  'TooManyRequestsException',
  'ThrottlingException',
  'Throttling',
  'ProvisionedThroughputExceededException',
  'RequestLimitExceeded',
  'BandwidthLimitExceeded',
  'RequestThrottledException',
  'RequestThrottled',
  'ServiceQuotaExceededException',
  'LimitExceededException',
  'TransactionConflictException',
  'TransactionInProgressException',
  'InternalServerError',
  'InternalError',
  'InternalFailure',
  'ServiceUnavailable',
  'ServiceUnavailableException',
  'GatewayTimeout',
  'GatewayTimeoutException',
  'TimeoutError',
  'RequestTimeout',
  'RequestTimeoutException',
  'EC2ThrottledException',
  'PriorRequestNotComplete',
  'SlowDown',
  'NetworkingError',
]);

export const KNOWN_NON_RETRYABLE_ERROR_NAMES: ReadonlySet<string> = new Set([
  'PermanentStepError',
  'SecurityViolationError',
  'ValidationException',
  'InvalidParameterException',
  'InvalidParameterValueException',
  'InvalidParameterCombinationException',
  'InvalidQueryParameterException',
  'InvalidRequestException',
  'InvalidRequestContentException',
  'InvalidAction',
  'MissingAction',
  'MissingParameter',
  'MissingParameterException',
  'MalformedQueryString',
  'OptInRequired',
  'ResourceNotFoundException',
  'ResourceNotFound',
  'NotFoundException',
  'NoSuchBucket',
  'NoSuchKey',
  'NoSuchEntity',
  'AccessDeniedException',
  'AccessDenied',
  'NotAuthorizedException',
  'UnauthorizedException',
  'Unauthorized',
  'ForbiddenException',
  'UnrecognizedClientException',
  'AuthFailure',
  'InvalidSignatureException',
  'SignatureDoesNotMatch',
  'IncompleteSignature',
  'InvalidClientTokenId',
  'ExpiredToken',
  'ExpiredTokenException',
  'InvalidToken',
  'ConditionalCheckFailedException',
  'TransactionCanceledException',
  'ItemCollectionSizeLimitExceededException',
  'SerializationException',
  'JsonParseError',
  'SyntaxError',
  'TypeError',
  'ReferenceError',
  'RangeError',
]);

const NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'EAI_AGAIN',
  'ESOCKETTIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const extractExplicitIsRetryable = (err: any): boolean | undefined => {
  if (!err || typeof err !== 'object') return undefined;

  if (typeof err.isRetryable === 'boolean') return err.isRetryable;
  if (err.details && typeof err.details.isRetryable === 'boolean') return err.details.isRetryable;
  if (err.errorDetails && typeof err.errorDetails.isRetryable === 'boolean') return err.errorDetails.isRetryable;

  if (err.cause) {
    if (typeof err.cause.isRetryable === 'boolean') return err.cause.isRetryable;
    if (err.cause.details && typeof err.cause.details.isRetryable === 'boolean') return err.cause.details.isRetryable;
    if (err.cause.errorDetails && typeof err.cause.errorDetails.isRetryable === 'boolean') return err.cause.errorDetails.isRetryable;
  }

  return undefined;
};

const extractErrorNames = (err: any): string[] => {
  if (!err) return [];
  const names: string[] = [];

  const addName = (val: unknown) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      const trimmed = val.trim();
      names.push(trimmed);
      if (trimmed.includes('#')) {
        const afterHash = trimmed.split('#').pop()?.trim();
        if (afterHash) names.push(afterHash);
      }
      if (trimmed.includes(':')) {
        const beforeColon = trimmed.split(':')[0]?.trim();
        if (beforeColon) names.push(beforeColon);
      }
    }
  };

  if (typeof err === 'string') {
    addName(err);
    return names;
  }

  if (typeof err === 'object') {
    addName(err.name);
    addName(err.errorType);
    addName(err.errorName);
    addName(err.__type);
    addName(err.code);

    if (err.details) {
      addName(err.details.name);
      addName(err.details.errorType);
      addName(err.details.errorName);
      addName(err.details.code);
    }
    if (err.errorDetails) {
      addName(err.errorDetails.name);
      addName(err.errorDetails.errorType);
      addName(err.errorDetails.errorName);
      addName(err.errorDetails.code);
    }
    if (err.cause) {
      addName(err.cause.name);
      addName(err.cause.errorType);
      addName(err.cause.errorName);
      addName(err.cause.code);
    }
  }

  return names;
};

const extractHttpStatusCode = (err: any): number | undefined => {
  if (!err || typeof err !== 'object') return undefined;

  const candidates = [
    err.statusCode,
    err.status,
    err.$metadata?.httpStatusCode,
    err.$response?.statusCode,
    err.response?.status,
    err.details?.statusCode,
    err.details?.status,
    err.errorDetails?.statusCode,
    err.errorDetails?.status,
    err.cause?.statusCode,
    err.cause?.status,
    err.cause?.$metadata?.httpStatusCode,
  ];

  for (const code of candidates) {
    if (typeof code === 'number' && !Number.isNaN(code)) return code;
    if (typeof code === 'string' && /^\d{3}$/.test(code)) return parseInt(code, 10);
  }

  return undefined;
};

const extractAwsFault = (err: any): 'client' | 'server' | undefined => {
  if (!err || typeof err !== 'object') return undefined;

  if (err.$fault === 'client' || err.$fault === 'server') return err.$fault;
  if (err.details?.$fault === 'client' || err.details?.$fault === 'server') return err.details.$fault;
  if (err.cause?.$fault === 'client' || err.cause?.$fault === 'server') return err.cause.$fault;

  return undefined;
};

export const isRetryableError = (error: unknown): boolean => {
  const explicit = extractExplicitIsRetryable(error);
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  if (error instanceof PermanentStepError || error instanceof SecurityViolationError) {
    return false;
  }
  if (error instanceof TransientStepError || error instanceof RetryableStepError || error instanceof ContentBasedRetryableError) {
    return true;
  }

  const names = extractErrorNames(error);
  for (const name of names) {
    if (KNOWN_RETRYABLE_ERROR_NAMES.has(name) || NETWORK_ERROR_CODES.has(name)) {
      return true;
    }
    if (KNOWN_NON_RETRYABLE_ERROR_NAMES.has(name)) {
      return false;
    }
  }

  const statusCode = extractHttpStatusCode(error);
  if (statusCode !== undefined) {
    if (statusCode === 429 || statusCode === 408) return true;
    if (statusCode >= 500 && statusCode <= 599) return true;
    if (statusCode >= 400 && statusCode <= 499) return false;
  }

  const fault = extractAwsFault(error);
  if (fault === 'server') return true;
  if (fault === 'client') return false;

  const message = typeof error === 'string' ? error : (error as any)?.message;
  if (typeof message === 'string') {
    if (/\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|EPIPE|socket hang up|network timeout|fetch failed)\b/i.test(message)) {
      return true;
    }
  }

  return true;
};

export const classifyStepError = (
  error: unknown,
  messagePrefix?: string,
  additionalDetails?: any,
): TransientStepError | PermanentStepError => {
  if (!messagePrefix && (error instanceof TransientStepError || error instanceof PermanentStepError)) {
    return error;
  }

  const retryable = isRetryableError(error);

  let rawMessage = '';
  if (error instanceof Error) {
    rawMessage = error.message;
  } else if (error && typeof error === 'object') {
    const errObj = error as Record<string, any>;
    rawMessage = errObj.errorMessage || errObj.message || (typeof errObj.rawError === 'string' ? errObj.rawError : JSON.stringify(error));
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else {
    rawMessage = 'Unknown step execution failure';
  }

  const fullMessage = messagePrefix
    ? (rawMessage && rawMessage.startsWith(messagePrefix) ? rawMessage : `${messagePrefix}: ${rawMessage}`)
    : (rawMessage || 'Step execution failed');

  let details: any;
  if (error instanceof Error) {
    const errObj = error as any;
    const baseDetails = errObj.details ?? errObj.errorDetails;
    if (baseDetails && typeof baseDetails === 'object' && additionalDetails && typeof additionalDetails === 'object') {
      details = { ...baseDetails, ...additionalDetails };
    } else {
      details = baseDetails ?? additionalDetails;
    }
  } else if (error && typeof error === 'object') {
    if (additionalDetails && typeof additionalDetails === 'object') {
      details = { ...error, ...additionalDetails };
    } else {
      details = error;
    }
  } else {
    details = additionalDetails;
  }

  const originalError = error instanceof Error ? error : (rawMessage ? new Error(rawMessage) : undefined);

  return retryable
    ? new TransientStepError(fullMessage, details, originalError)
    : new PermanentStepError(fullMessage, details, originalError);
};
