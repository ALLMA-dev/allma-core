import { describe, it, expect } from 'vitest';
import { jp } from './jp.js';

describe('jp() path validation (typo detection)', () => {
  it('returns a well-formed path unchanged', () => {
    expect(jp('$.steps_output.doc_text')).toBe('$.steps_output.doc_text');
    expect(jp('$.flow_variables.outputBucket')).toBe('$.flow_variables.outputBucket');
  });

  it('throws on a path that does not start with $.', () => {
    expect(() => jp('steps_output.x')).toThrow(/not a valid JSONPath/);
    expect(() => jp('x.y.z')).toThrow(/not a valid JSONPath/);
    expect(() => jp('')).toThrow(/not a valid JSONPath/);
  });

  it('is usable as a mapping key and value (stays a primitive string)', () => {
    const mapping = { [jp('$.steps_output.summary')]: jp('$.text') };
    expect(JSON.parse(JSON.stringify(mapping))).toEqual({ '$.steps_output.summary': '$.text' });
  });
});

describe('jp comparison builders', () => {
  it('quotes string literals and emits the runtime condition grammar', () => {
    expect(jp.eq('$.poll.status', 'DONE')).toBe("$.poll.status === 'DONE'");
    expect(jp.ne('$.poll.status', 'PENDING')).toBe("$.poll.status !== 'PENDING'");
  });

  it('emits numbers, booleans, and null without quotes', () => {
    expect(jp.gt('$.poll.attempts', 5)).toBe('$.poll.attempts > 5');
    expect(jp.gte('$.poll.attempts', 3)).toBe('$.poll.attempts >= 3');
    expect(jp.lt('$.score', 0.5)).toBe('$.score < 0.5');
    expect(jp.eq('$.flags.enabled', true)).toBe('$.flags.enabled === true');
    expect(jp.eq('$.result', null)).toBe('$.result === null');
  });

  it('treats a right-side JSONPath as a reference, not a quoted literal', () => {
    expect(jp.eq('$.a', jp('$.b'))).toBe('$.a === $.b');
    expect(jp.eq('$.a', '$.b')).toBe('$.a === $.b');
  });

  it('validates the left-hand path too (typo detection)', () => {
    expect(() => jp.eq('poll.status', 'DONE')).toThrow(/not a valid JSONPath/);
  });

  it('rejects a literal containing both quote types', () => {
    expect(() => jp.eq('$.x', `a'b"c`)).toThrow(/both quote types/);
  });
});
