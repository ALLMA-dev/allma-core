import { describe, it, expect } from 'vitest';
import {
  PermanentStepError,
  TransientStepError,
  RetryableStepError,
  ContentBasedRetryableError,
  SecurityViolationError,
} from '@allma/core-types';
import {
  isRetryableError,
  classifyStepError,
  KNOWN_RETRYABLE_ERROR_NAMES,
  KNOWN_NON_RETRYABLE_ERROR_NAMES,
} from '../../../../src/allma-core/utils/error-classifier.js';

describe('error-classifier', () => {
  describe('isRetryableError — explicit isRetryable boolean flag', () => {
    it('returns false when isRetryable: false is top-level', () => {
      expect(isRetryableError({ isRetryable: false })).toBe(false);
      expect(isRetryableError(Object.assign(new Error('500 internal server error'), { isRetryable: false }))).toBe(false);
    });

    it('returns true when isRetryable: true is top-level', () => {
      expect(isRetryableError({ isRetryable: true })).toBe(true);
      expect(isRetryableError(Object.assign(new Error('validation failure'), { isRetryable: true }))).toBe(true);
    });

    it('returns boolean when nested in details', () => {
      expect(isRetryableError({ details: { isRetryable: false } })).toBe(false);
      expect(isRetryableError({ details: { isRetryable: true } })).toBe(true);
    });

    it('returns boolean when nested in errorDetails', () => {
      expect(isRetryableError({ errorDetails: { isRetryable: false, errorType: 'ValidationException' } })).toBe(false);
      expect(isRetryableError({ errorDetails: { isRetryable: true, statusCode: 400 } })).toBe(true);
    });

    it('returns boolean when nested in cause or cause details', () => {
      expect(isRetryableError({ cause: { isRetryable: false } })).toBe(false);
      expect(isRetryableError({ cause: { details: { isRetryable: false } } })).toBe(false);
      expect(isRetryableError({ cause: { errorDetails: { isRetryable: true } } })).toBe(true);
    });
  });

  describe('isRetryableError — custom error class instances', () => {
    it('treats PermanentStepError and SecurityViolationError as non-retryable', () => {
      expect(isRetryableError(new PermanentStepError('Fatal'))).toBe(false);
      expect(isRetryableError(new SecurityViolationError('Forbidden text'))).toBe(false);
    });

    it('treats TransientStepError, RetryableStepError, and ContentBasedRetryableError as retryable', () => {
      expect(isRetryableError(new TransientStepError('Temporary failure'))).toBe(true);
      expect(isRetryableError(new RetryableStepError('SFN retryable'))).toBe(true);
      expect(isRetryableError(new ContentBasedRetryableError('Bad LLM JSON'))).toBe(true);
    });
  });

  describe('isRetryableError — known non-retryable AWS client error names', () => {
    const nonRetryableExamples = [
      'ValidationException',
      'InvalidParameterValueException',
      'InvalidParameterException',
      'InvalidRequestContentException',
      'ResourceNotFoundException',
      'AccessDeniedException',
      'UnauthorizedException',
      'ConditionalCheckFailedException',
      'TransactionCanceledException',
      'ItemCollectionSizeLimitExceededException',
      'SerializationException',
      'NoSuchKey',
      'NoSuchBucket',
      'TypeError',
    ];

    it.each(nonRetryableExamples)('evaluates %s as non-retryable (false)', (name) => {
      expect(isRetryableError({ name })).toBe(false);
      expect(isRetryableError({ errorType: name })).toBe(false);
      expect(isRetryableError({ details: { name } })).toBe(false);
      expect(isRetryableError(Object.assign(new Error(name), { name }))).toBe(false);
    });

    it('handles prefixed AWS error names', () => {
      expect(isRetryableError({ name: 'com.amazon.coral.validate#ValidationException' })).toBe(false);
      expect(isRetryableError({ errorType: 'com.amazonaws.dynamodb.v20120810#ValidationException' })).toBe(false);
      expect(isRetryableError({ name: 'ValidationException:1 error detected' })).toBe(false);
    });
  });

  describe('isRetryableError — known retryable error names', () => {
    const retryableExamples = [
      'TooManyRequestsException',
      'ThrottlingException',
      'Throttling',
      'ProvisionedThroughputExceededException',
      'ServiceQuotaExceededException',
      'LimitExceededException',
      'TransactionConflictException',
      'InternalServerError',
      'ServiceUnavailableException',
      'GatewayTimeout',
      'TimeoutError',
      'RequestTimeoutException',
    ];

    it.each(retryableExamples)('evaluates %s as retryable (true)', (name) => {
      expect(isRetryableError({ name })).toBe(true);
      expect(isRetryableError({ errorType: name })).toBe(true);
      expect(isRetryableError({ details: { errorType: name } })).toBe(true);
      expect(isRetryableError(Object.assign(new Error(name), { name }))).toBe(true);
    });
  });

  describe('isRetryableError — HTTP status codes', () => {
    it.each([400, 401, 403, 404, 409, 422])('evaluates HTTP %i as non-retryable (false)', (statusCode) => {
      expect(isRetryableError({ statusCode })).toBe(false);
      expect(isRetryableError({ status: statusCode })).toBe(false);
      expect(isRetryableError({ $metadata: { httpStatusCode: statusCode } })).toBe(false);
      expect(isRetryableError({ response: { status: statusCode } })).toBe(false);
    });

    it.each([429, 408])('evaluates HTTP %i as retryable (true)', (statusCode) => {
      expect(isRetryableError({ statusCode })).toBe(true);
      expect(isRetryableError({ $metadata: { httpStatusCode: statusCode } })).toBe(true);
    });

    it.each([500, 502, 503, 504])('evaluates HTTP %i as retryable (true)', (statusCode) => {
      expect(isRetryableError({ statusCode })).toBe(true);
      expect(isRetryableError({ $metadata: { httpStatusCode: statusCode } })).toBe(true);
    });
  });

  describe('isRetryableError — AWS $fault attribute', () => {
    it('treats $fault: "client" as non-retryable', () => {
      expect(isRetryableError({ $fault: 'client', message: 'Unknown client error' })).toBe(false);
      expect(isRetryableError({ details: { $fault: 'client' } })).toBe(false);
    });

    it('treats $fault: "server" as retryable', () => {
      expect(isRetryableError({ $fault: 'server', message: 'Unknown server error' })).toBe(true);
      expect(isRetryableError({ details: { $fault: 'server' } })).toBe(true);
    });
  });

  describe('isRetryableError — network and connection errors', () => {
    it.each(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND', 'EPIPE'])(
      'evaluates network code %s as retryable',
      (code) => {
        expect(isRetryableError({ code })).toBe(true);
        expect(isRetryableError(Object.assign(new Error('Connection failed'), { code }))).toBe(true);
      },
    );

    it('evaluates error messages mentioning socket or network failure as retryable', () => {
      expect(isRetryableError(new Error('socket hang up'))).toBe(true);
      expect(isRetryableError(new Error('network timeout occurred'))).toBe(true);
      expect(isRetryableError('fetch failed due to ECONNRESET')).toBe(true);
    });
  });

  describe('isRetryableError — fallback for unexpected runtime errors', () => {
    it('defaults unclassified runtime errors to transient (true)', () => {
      expect(isRetryableError(new Error('Unexpected transient glitch'))).toBe(true);
      expect(isRetryableError('Unexpected runtime glitch')).toBe(true);
    });
  });

  describe('classifyStepError', () => {
    it('creates a PermanentStepError for non-retryable errors', () => {
      const err = Object.assign(new Error('Empty GSI sort key'), { name: 'ValidationException' });
      const classified = classifyStepError(err, 'Failed to invoke custom logic Lambda');

      expect(classified).toBeInstanceOf(PermanentStepError);
      expect(classified.name).toBe('PermanentStepError');
      expect(classified.message).toBe('Failed to invoke custom logic Lambda: Empty GSI sort key');
      expect(classified.originalError).toBe(err);
    });

    it('creates a TransientStepError for retryable errors', () => {
      const err = Object.assign(new Error('Rate exceeded'), { name: 'TooManyRequestsException' });
      const classified = classifyStepError(err, 'Failed to invoke custom logic Lambda');

      expect(classified).toBeInstanceOf(TransientStepError);
      expect(classified.name).toBe('TransientStepError');
      expect(classified.message).toBe('Failed to invoke custom logic Lambda: Rate exceeded');
      expect(classified.originalError).toBe(err);
    });

    it('correctly classifies parsed Lambda error payloads with isRetryable: false', () => {
      const payload = {
        errorMessage: 'Cannot insert null key',
        errorType: 'ValidationException',
        isRetryable: false,
        details: { field: 'supplier_id' },
      };

      const classified = classifyStepError(payload, 'Custom Lambda failed');

      expect(classified).toBeInstanceOf(PermanentStepError);
      expect(classified.name).toBe('PermanentStepError');
      expect(classified.message).toBe('Custom Lambda failed: Cannot insert null key');
      expect(classified.details).toEqual({
        errorMessage: 'Cannot insert null key',
        errorType: 'ValidationException',
        isRetryable: false,
        details: { field: 'supplier_id' },
      });
    });

    it('correctly classifies string errors', () => {
      const permanent = classifyStepError('ValidationException: Missing required attribute');
      expect(permanent).toBeInstanceOf(PermanentStepError);
      expect(permanent.message).toBe('ValidationException: Missing required attribute');

      const transient = classifyStepError('TooManyRequestsException: Throttled', 'Step failed');
      expect(transient).toBeInstanceOf(TransientStepError);
      expect(transient.message).toBe('Step failed: TooManyRequestsException: Throttled');
    });

    it('merges additionalDetails into details', () => {
      const err = { errorMessage: 'Access denied', errorType: 'AccessDeniedException' };
      const classified = classifyStepError(err, 'Step failed', { stepInstanceId: 'step-1' });

      expect(classified).toBeInstanceOf(PermanentStepError);
      expect(classified.details).toEqual({
        errorMessage: 'Access denied',
        errorType: 'AccessDeniedException',
        stepInstanceId: 'step-1',
      });
    });

    it('does not duplicate prefix when message already starts with it', () => {
      const err = new Error('Custom step failed: Invalid parameter');
      const classified = classifyStepError(err, 'Custom step failed');

      expect(classified.message).toBe('Custom step failed: Invalid parameter');
    });

    it('returns existing PermanentStepError or TransientStepError instance if no prefix provided', () => {
      const perm = new PermanentStepError('Already permanent', { code: 123 });
      expect(classifyStepError(perm)).toBe(perm);

      const trans = new TransientStepError('Already transient', { code: 456 });
      expect(classifyStepError(trans)).toBe(trans);
    });
  });

  describe('exported sets', () => {
    it('exports KNOWN_RETRYABLE_ERROR_NAMES and KNOWN_NON_RETRYABLE_ERROR_NAMES as ReadonlySets', () => {
      expect(KNOWN_RETRYABLE_ERROR_NAMES).toBeInstanceOf(Set);
      expect(KNOWN_NON_RETRYABLE_ERROR_NAMES).toBeInstanceOf(Set);
      expect(KNOWN_RETRYABLE_ERROR_NAMES.has('TooManyRequestsException')).toBe(true);
      expect(KNOWN_NON_RETRYABLE_ERROR_NAMES.has('ValidationException')).toBe(true);
    });
  });
});
