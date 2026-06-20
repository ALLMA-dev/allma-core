import { describe, it, expect } from 'vitest';
import { renderNestedTemplates } from '../../../../src/allma-core/utils/template-renderer.js';

/**
 * Unit tests for the recursive template renderer, which runs a Handlebars pass then a
 * whole-string JSONPath pass over every string in an object. Cases use plain in-memory
 * context (no S3 pointers), so no AWS stubbing is required.
 */

const ctx = {
  user: { name: 'Ada', age: 36 },
  pathVar: '$.user.name',
  self: '$.self',
  items: [{ v: 1 }, { v: 2 }],
};

describe('renderNestedTemplates', () => {
  it('returns undefined for undefined input', async () => {
    expect(await renderNestedTemplates(undefined, ctx)).toBeUndefined();
  });

  it('resolves a pure JSONPath string to its (non-string) value', async () => {
    const out = await renderNestedTemplates({ age: '$.user.age' }, ctx);
    expect(out).toEqual({ age: 36 });
  });

  it('interpolates Handlebars placeholders within a string', async () => {
    const out = await renderNestedTemplates({ greeting: 'Hi {{user.name}}!' }, ctx);
    expect(out).toEqual({ greeting: 'Hi Ada!' });
  });

  it('resolves a Handlebars result that is itself a JSONPath', async () => {
    // {{pathVar}} -> "$.user.name" -> resolved to "Ada"
    const out = await renderNestedTemplates({ name: '{{pathVar}}' }, ctx);
    expect(out).toEqual({ name: 'Ada' });
  });

  it('recurses into nested objects and arrays', async () => {
    const out = await renderNestedTemplates(
      { outer: { inner: 'Hi {{user.name}}', list: ['$.user.age', 'literal'] } },
      ctx,
    );
    expect(out).toEqual({ outer: { inner: 'Hi Ada', list: [36, 'literal'] } });
  });

  it('passes through non-string primitives unchanged', async () => {
    const out = await renderNestedTemplates({ n: 7, b: false, z: null }, ctx);
    expect(out).toEqual({ n: 7, b: false, z: null });
  });

  it('returns undefined for a JSONPath that resolves to nothing', async () => {
    const out = await renderNestedTemplates({ missing: '$.user.unknown' }, ctx);
    expect(out).toEqual({ missing: undefined });
  });

  it('treats a JSONPath-looking string that fails to resolve as a literal', async () => {
    // Dynamic segment whose inner path is missing makes the resolver throw; renderer
    // catches it and returns the string unchanged.
    const out = await renderNestedTemplates({ v: '$.map[$.missing]' }, { map: {} });
    expect(out).toEqual({ v: '$.map[$.missing]' });
  });

  it('does not infinitely recurse when a path resolves to itself', async () => {
    const out = await renderNestedTemplates({ s: '$.self' }, ctx);
    expect(out).toEqual({ s: '$.self' });
  });
});
