import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Logger from './logger.js';

const SLOT = Symbol.for('allma.core-sdk.logRedactor');
const slot = globalThis as unknown as Record<symbol, unknown>;
const NOW = new Date('2026-01-01T12:00:00.000Z');
const EMAIL = 'jane.doe@example.com';
const MARKER = '[REDACTION_FAILED]';
const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;
type Level = (typeof LEVELS)[number];

let output: string[];

const loadLogger = async (redactionConfig = ''): Promise<typeof Logger> => {
  vi.resetModules();
  vi.stubEnv('LOG_LEVEL', 'DEBUG');
  vi.stubEnv('LOG_REDACTION_CONFIG', redactionConfig);
  return import('./logger.js');
};

const logAt = (logger: typeof Logger, level: Level, message: string, details?: object, correlationId?: string) =>
  ({
    DEBUG: logger.log_debug,
    INFO: logger.log_info,
    WARN: logger.log_warn,
    ERROR: logger.log_error,
    CRITICAL: logger.log_critical,
  })[level](message, details, correlationId);

const lastEntry = () => JSON.parse(output[output.length - 1]);

const maskEmail = (value: unknown) =>
  typeof value === 'string' ? value.replaceAll(EMAIL, '[EMAIL]') : JSON.parse(JSON.stringify(value).replaceAll(EMAIL, '[EMAIL]'));

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(NOW);
  output = [];
  vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    output.push(String(line));
  });
  delete slot[SLOT];
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  delete slot[SLOT];
});

describe('logger redaction', () => {
  it.each(LEVELS)('applies a registered redactor to details and message at %s', async (level) => {
    const logger = await loadLogger();
    logger.setLogRedactor(maskEmail);

    logAt(logger, level, `Contact ${EMAIL}`, { user: { email: EMAIL } }, 'cid-1');

    expect(lastEntry()).toEqual({
      level,
      message: 'Contact [EMAIL]',
      correlationId: 'cid-1',
      user: { email: '[EMAIL]' },
      timestamp: NOW.toISOString(),
    });
  });

  it.each(LEVELS)('writes the marker and never the raw values when the redactor throws at %s', async (level) => {
    const logger = await loadLogger();
    logger.setLogRedactor(() => {
      throw new Error(`cannot redact ${EMAIL}`);
    });

    logAt(logger, level, `Secret message for ${EMAIL}`, { email: EMAIL }, 'cid-2');

    expect(output).toHaveLength(1);
    expect(lastEntry()).toEqual({ level, message: MARKER, correlationId: 'cid-2', details: MARKER, timestamp: NOW.toISOString() });
    expect(output.join('')).not.toContain(EMAIL);
    expect(output.join('')).not.toContain('Secret message');
  });

  it.each([
    ['a non-object for details', (value: unknown) => (typeof value === 'string' ? value : 'not an object')],
    ['an array for details', (value: unknown) => (typeof value === 'string' ? value : [value])],
    ['a non-string for message', (value: unknown) => (typeof value === 'string' ? { value } : {})],
  ])('writes the marker when the redactor returns %s', async (_case, redactor) => {
    const logger = await loadLogger();
    logger.setLogRedactor(redactor);

    logger.log_info(`Hello ${EMAIL}`, { email: EMAIL });

    expect(lastEntry()).toEqual({ level: 'INFO', message: MARKER, correlationId: 'N/A', details: MARKER, timestamp: NOW.toISOString() });
    expect(output.join('')).not.toContain(EMAIL);
  });

  it('stops redacting once the redactor is cleared', async () => {
    const logger = await loadLogger();
    logger.setLogRedactor(maskEmail);
    logger.setLogRedactor(undefined);

    logger.log_info(EMAIL);

    expect(lastEntry().message).toBe(EMAIL);
  });

  it.each(LEVELS)('keeps the existing output byte-for-byte with no redactor at %s', async (level) => {
    const logger = await loadLogger();
    const timestamp = NOW.toISOString();

    logAt(logger, level, `Contact ${EMAIL}`, { email: EMAIL, nested: { n: 1 } }, 'cid-3');
    logAt(logger, level, 'No details');

    expect(output).toEqual([
      JSON.stringify({ level, message: `Contact ${EMAIL}`, correlationId: 'cid-3', email: EMAIL, nested: { n: 1 }, timestamp }),
      JSON.stringify({ level, message: 'No details', correlationId: 'N/A', timestamp }),
    ]);
  });

  it('registers the key/pattern redactor from LOG_REDACTION_CONFIG', async () => {
    const logger = await loadLogger(JSON.stringify({ keys: ['email'], patterns: ['[^@\\s]+@[^@\\s]+'] }));
    const cycle: Record<string, unknown> = { name: 'loop' };
    cycle.self = cycle;
    const shared = { id: 1 };
    const details = {
      Email: EMAIL,
      nested: { list: [`write to ${EMAIL}`, 7] },
      createdAt: new Date('2025-05-05T05:05:05.000Z'),
      cycle,
      first: shared,
      second: shared,
    };

    logger.log_info(`Mail from ${EMAIL}`, details);

    expect(lastEntry()).toEqual({
      level: 'INFO',
      message: 'Mail from [REDACTED]',
      correlationId: 'N/A',
      Email: '[REDACTED]',
      nested: { list: ['write to [REDACTED]', 7] },
      createdAt: '2025-05-05T05:05:05.000Z',
      cycle: { name: 'loop', self: '[Circular]' },
      first: { id: 1 },
      second: { id: 1 },
      timestamp: NOW.toISOString(),
    });
    expect(details.Email).toBe(EMAIL);
    expect(details.nested.list[0]).toBe(`write to ${EMAIL}`);
  });

  it('uses the configured replacement literally', async () => {
    const logger = await loadLogger(JSON.stringify({ keys: ['token'], patterns: ['\\d{4}'], replacement: '$&-hidden' }));

    logger.log_info('card 1234', { token: 'abc' });

    expect(lastEntry()).toMatchObject({ message: 'card $&-hidden', token: '$&-hidden' });
  });

  it('keeps a redactor registered before the module loads', async () => {
    slot[SLOT] = (value: unknown) => (typeof value === 'string' ? 'preset message' : { preset: true });
    const logger = await loadLogger(JSON.stringify({ keys: ['email'], patterns: [] }));

    logger.log_info('original', { email: EMAIL });

    expect(lastEntry()).toEqual({ level: 'INFO', message: 'preset message', correlationId: 'N/A', preset: true, timestamp: NOW.toISOString() });
  });

  it.each([
    ['invalid JSON', '{"keys": ["secret-config-value"', 'JsonParseError'],
    ['an uncompilable pattern', JSON.stringify({ keys: [], patterns: ['(secret-config-value'] }), 'SchemaValidationError'],
  ])('fails closed on %s in LOG_REDACTION_CONFIG', async (_case, config, errorKind) => {
    const logger = await loadLogger(config);

    logger.log_info(`Mail from ${EMAIL}`, { email: EMAIL });

    expect(output).toHaveLength(2);
    expect(JSON.parse(output[0])).toMatchObject({ level: 'WARN', errorKind });
    expect(lastEntry()).toEqual({ level: 'INFO', message: MARKER, correlationId: 'N/A', details: MARKER, timestamp: NOW.toISOString() });
    expect(output.join('')).not.toContain(EMAIL);
    expect(output.join('')).not.toContain('secret-config-value');
  });
});
