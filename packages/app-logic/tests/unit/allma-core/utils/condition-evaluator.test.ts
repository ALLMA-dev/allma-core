import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../../../../src/allma-core/utils/condition-evaluator.js';

/**
 * Unit tests for the condition evaluator. Conditions resolve their operands through the
 * S3-aware data mapper, but these cases use plain in-memory context (no S3 pointers), so no
 * AWS stubbing is required.
 */

const ctx = {
  num: 10,
  str: 'hello',
  bool: true,
  zero: 0,
  empty: '',
  nul: null,
  arr: [1, 2, 3],
  emptyArr: [] as number[],
  obj: { nested: 5 },
  other: 10,
};

const eval_ = async (condition: string, context: Record<string, unknown> = ctx) =>
  (await evaluateCondition(condition, context)).result;

describe('evaluateCondition — comparison operators (literal RHS)', () => {
  it.each([
    ['$.num > 5', true],
    ['$.num > 10', false],
    ['$.num < 20', true],
    ['$.num >= 10', true],
    ['$.num <= 9', false],
    ['$.num == 10', true],
    ['$.num = 10', true],
    ['$.num === 10', true],
    ['$.num != 11', true],
    ['$.num !== 10', false],
  ])('%s -> %s', async (condition, expected) => {
    expect(await eval_(condition)).toBe(expected);
  });
});

describe('evaluateCondition — typed literals', () => {
  it('compares string literals (single quotes)', async () => {
    expect(await eval_("$.str == 'hello'")).toBe(true);
    expect(await eval_("$.str == 'world'")).toBe(false);
  });

  it('compares string literals (double quotes)', async () => {
    expect(await eval_('$.str == "hello"')).toBe(true);
  });

  it('compares boolean literals', async () => {
    expect(await eval_('$.bool == true')).toBe(true);
    expect(await eval_('$.bool == false')).toBe(false);
  });

  it('compares null literal', async () => {
    expect(await eval_('$.nul == null')).toBe(true);
    expect(await eval_('$.num == null')).toBe(false);
  });

  it('compares negative and decimal numbers', async () => {
    expect(await eval_('$.num > -5', { num: -1 })).toBe(true);
    expect(await eval_('$.num < 1.5', { num: 1.25 })).toBe(true);
  });
});

describe('evaluateCondition — loose vs strict equality coercion', () => {
  it('loose equality coerces string/number', async () => {
    expect(await eval_('$.val == 10', { val: '10' })).toBe(true);
  });

  it('strict equality does not coerce', async () => {
    expect(await eval_('$.val === 10', { val: '10' })).toBe(false);
  });
});

describe('evaluateCondition — JSONPath RHS', () => {
  it('compares two resolved paths', async () => {
    expect(await eval_('$.num == $.other')).toBe(true);
    expect(await eval_('$.num == $.zero')).toBe(false);
  });

  it('greater-than between two paths', async () => {
    expect(await eval_('$.num > $.zero')).toBe(true);
  });
});

describe('evaluateCondition — truthiness (no operator)', () => {
  it.each([
    ['$.num', true],
    ['$.bool', true],
    ['$.str', true],
    ['$.zero', false],
    ['$.empty', false],
    ['$.nul', false],
    ['$.missing', false],
  ])('%s is %s', async (condition, expected) => {
    expect(await eval_(condition)).toBe(expected);
  });

  const items = { items: [{ v: 1 }, { v: 5 }] };

  it('treats a non-empty filter result array as truthy', async () => {
    expect(await eval_('$.items[?(@.v>1)]', items)).toBe(true);
  });

  it('treats an empty filter result array as falsy', async () => {
    expect(await eval_('$.items[?(@.v>99)]', items)).toBe(false);
  });
});

describe('evaluateCondition — compound AND/OR with precedence', () => {
  it('AND chain is true only when all parts hold', async () => {
    expect(await eval_('$.num > 5 && $.str == "hello"')).toBe(true);
    expect(await eval_('$.num > 5 && $.str == "world"')).toBe(false);
  });

  it('OR chain is true when any part holds', async () => {
    expect(await eval_('$.num > 99 || $.str == "hello"')).toBe(true);
    expect(await eval_('$.num > 99 || $.str == "world"')).toBe(false);
  });

  it('OR has lower precedence than AND', async () => {
    // false && false  ||  true  => true
    expect(await eval_('$.num > 99 && $.num < 0 || $.bool == true')).toBe(true);
  });
});

describe('evaluateCondition — malformed / unsupported', () => {
  it('returns false for an unsupported operator', async () => {
    // `<>` matches the operator character class but is not in the comparison switch,
    // so it logs a warning and evaluates to false.
    expect(await eval_('$.num <> 5')).toBe(false);
  });

  it('returns false for a path that does not exist used as truthiness', async () => {
    expect(await eval_('$.deeply.missing.path')).toBe(false);
  });
});
