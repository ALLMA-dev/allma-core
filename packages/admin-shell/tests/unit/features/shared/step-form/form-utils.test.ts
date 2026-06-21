import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { getDefaultsFromShape } from '../../../../../src/features/shared/step-form/form-utils.js';

describe('getDefaultsFromShape', () => {
  it('uses the schema default when one is declared', () => {
    const shape = { withDefault: z.string().default('hello') };
    expect(getDefaultsFromShape(shape)).toEqual({ withDefault: 'hello' });
  });

  it('defaults strings and effects (transform/refine) to an empty string', () => {
    const shape = {
      plain: z.string(),
      email: z.string().email(),
      transformed: z.string().transform((s) => s.trim()),
    };
    expect(getDefaultsFromShape(shape)).toEqual({ plain: '', email: '', transformed: '' });
  });

  it('defaults objects and records to an empty object', () => {
    const shape = {
      obj: z.object({ a: z.string() }),
      rec: z.record(z.string()),
    };
    expect(getDefaultsFromShape(shape)).toEqual({ obj: {}, rec: {} });
  });

  it('defaults arrays to an empty array', () => {
    const shape = { list: z.array(z.string()) };
    expect(getDefaultsFromShape(shape)).toEqual({ list: [] });
  });

  it('defaults enums, numbers and booleans to null (safe for controlled inputs)', () => {
    const shape = {
      count: z.number(),
      enabled: z.boolean(),
      choice: z.enum(['a', 'b']),
    };
    expect(getDefaultsFromShape(shape)).toEqual({ count: null, enabled: null, choice: null });
  });

  it('returns an empty object for an empty shape', () => {
    expect(getDefaultsFromShape({})).toEqual({});
  });
});
