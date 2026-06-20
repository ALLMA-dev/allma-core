import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { MappingEventType, MappingEventStatus } from '@allma/core-types';
import {
  setByDotNotation,
  getSmartValueByJsonPath,
  prepareStepInput,
  processStepOutput,
} from '../../../src/allma-core/data-mapper.js';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

/**
 * Unit tests for the S3-aware JSONPath data mapper. S3 hydration is exercised hermetically:
 * core-sdk's `resolveS3Pointer` uses a module-scope S3Client that `mockClient(S3Client)`
 * intercepts, so no AWS account is required.
 */

const s3Mock = mockClient(S3Client);

/** Build a GetObject response whose JSON body hydrates to `payload`. */
const s3Json = (payload: unknown) =>
  s3Mock.on(GetObjectCommand).resolves({
    ContentType: 'application/json',
    ContentLength: 256,
    // Only transformToString is used for text/json content.
    Body: { transformToString: async () => JSON.stringify(payload) } as never,
  });

/** Wrap an S3 pointer the way offloaded step output is represented in the context. */
const pointer = (key = 'out.json') => ({ _s3_output_pointer: { bucket: 'b', key } });

beforeEach(() => resetAwsClientMocks(s3Mock));
afterEach(() => resetAwsClientMocks(s3Mock));

describe('setByDotNotation', () => {
  it('sets nested values via dot notation', () => {
    const obj: Record<string, unknown> = {};
    setByDotNotation(obj, 'a.b.c', 42);
    expect(obj).toEqual({ a: { b: { c: 42 } } });
  });

  it('creates arrays for numeric bracket segments', () => {
    const obj: Record<string, unknown> = {};
    setByDotNotation(obj, 'a.b[0].c', 'x');
    expect(obj).toEqual({ a: { b: [{ c: 'x' }] } });
  });

  it('overwrites an existing leaf value', () => {
    const obj = { a: { b: 1 } };
    setByDotNotation(obj, 'a.b', 2);
    expect(obj.a.b).toBe(2);
  });
});

describe('getSmartValueByJsonPath — simple paths (no S3)', () => {
  const data = { user: { name: 'Ada', roles: ['admin', 'dev'] }, count: 0 };

  it('resolves a nested value', async () => {
    const { value, events } = await getSmartValueByJsonPath('$.user.name', data, true);
    expect(value).toBe('Ada');
    expect(events).toEqual([]);
  });

  it('resolves an array element', async () => {
    const { value } = await getSmartValueByJsonPath('$.user.roles[1]', data, true);
    expect(value).toBe('dev');
  });

  it('returns undefined for a missing path', async () => {
    const { value } = await getSmartValueByJsonPath('$.user.missing.deep', data, true);
    expect(value).toBeUndefined();
  });

  it('returns undefined when the path does not start with root', async () => {
    const { value } = await getSmartValueByJsonPath('user.name', data, true);
    expect(value).toBeUndefined();
  });

  it('resolves a falsy-but-present value', async () => {
    const { value } = await getSmartValueByJsonPath('$.count', data, true);
    expect(value).toBe(0);
  });
});

describe('getSmartValueByJsonPath — complex paths', () => {
  it('applies a filter expression to a resolved base', async () => {
    const data = { items: [{ x: 1 }, { x: 5 }, { x: 9 }] };
    const { value } = await getSmartValueByJsonPath('$.items[?(@.x>4)]', data, true);
    expect(value).toEqual([{ x: 5 }, { x: 9 }]);
  });

  it('applies a recursive-descent scan', async () => {
    const data = { a: { x: 1 }, b: { c: { x: 2 } } };
    const { value } = await getSmartValueByJsonPath('$..x', data, true);
    expect(value).toEqual([1, 2]);
  });

  it('returns undefined when the base of a complex path is missing', async () => {
    const data = { items: [{ x: 1 }] };
    const { value } = await getSmartValueByJsonPath('$.missing[?(@.x>0)]', data, true);
    expect(value).toBeUndefined();
  });
});

describe('getSmartValueByJsonPath — dynamic path segments', () => {
  it('resolves a numeric dynamic index and emits a DYNAMIC_PATH_RESOLVE event', async () => {
    const data = { idx: 1, users: [{ name: 'a' }, { name: 'b' }] };
    const { value, events } = await getSmartValueByJsonPath('$.users[$.idx].name', data, true);
    expect(value).toBe('b');
    expect(events.some((e) => e.type === MappingEventType.DYNAMIC_PATH_RESOLVE)).toBe(true);
  });

  it('resolves a string dynamic key', async () => {
    const data = { key: 'foo', map: { foo: 42 } };
    const { value } = await getSmartValueByJsonPath('$.map[$.key]', data, true);
    expect(value).toBe(42);
  });

  it('throws when a dynamic segment resolves to null/undefined', async () => {
    const data = { map: { foo: 42 } };
    await expect(getSmartValueByJsonPath('$.map[$.missing]', data, true)).rejects.toThrow();
  });
});

describe('getSmartValueByJsonPath — S3 pointer hydration', () => {
  it('hydrates a pointer at the root when shouldHydrate is true', async () => {
    s3Json({ name: 'hydrated' });
    const { value, events } = await getSmartValueByJsonPath('$.name', pointer(), true);
    expect(value).toBe('hydrated');
    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    expect(events.some((e) => e.type === MappingEventType.S3_POINTER_RESOLVE)).toBe(true);
  });

  it('does NOT hydrate when shouldHydrate is false', async () => {
    const wrapper = pointer();
    const { value } = await getSmartValueByJsonPath('$', wrapper, false);
    expect(value).toEqual(wrapper);
    expect(s3Mock).not.toHaveReceivedCommand(GetObjectCommand);
  });

  it('hydrates a pointer encountered mid-path', async () => {
    s3Json({ inner: { leaf: 'deep' } });
    const data = { wrapped: pointer() };
    const { value } = await getSmartValueByJsonPath('$.wrapped.inner.leaf', data, true);
    expect(value).toBe('deep');
    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  });

  it('merges sibling keys over hydrated object data', async () => {
    s3Json({ a: 1, b: 2 });
    const data = { ...pointer(), b: 99 };
    const { value } = await getSmartValueByJsonPath('$.b', data, true);
    expect(value).toBe(99);
  });
});

describe('prepareStepInput', () => {
  it('maps multiple source paths into a prepared input object', async () => {
    const context = { a: { b: 'x' }, n: 7 };
    const { preparedInput, events } = await prepareStepInput(
      { 'out.value': '$.a.b', 'out.num': '$.n' },
      context,
      true,
    );
    expect(preparedInput).toEqual({ out: { value: 'x', num: 7 } });
    expect(events.some((e) => e.type === MappingEventType.INPUT_MAPPING && e.status === MappingEventStatus.SUCCESS)).toBe(true);
  });

  it('skips undefined sources and records a WARN event', async () => {
    const { preparedInput, events } = await prepareStepInput(
      { target: '$.does.not.exist' },
      { other: 1 },
      true,
    );
    expect(preparedInput).toEqual({});
    expect(events.some((e) => e.type === MappingEventType.INPUT_MAPPING && e.status === MappingEventStatus.WARN)).toBe(true);
  });

  it('records an ERROR event when source resolution throws (dynamic miss)', async () => {
    const { preparedInput, events } = await prepareStepInput(
      { target: '$.map[$.missing]' },
      { map: {} },
      true,
    );
    expect(preparedInput).toEqual({});
    expect(events.some((e) => e.status === MappingEventStatus.ERROR)).toBe(true);
  });

  it('deep-clones object values so the prepared input is detached from context', async () => {
    const context = { src: { nested: { n: 1 } } };
    const { preparedInput } = await prepareStepInput({ copy: '$.src' }, context, true);
    (preparedInput.copy as { nested: { n: number } }).nested.n = 999;
    expect(context.src.nested.n).toBe(1);
  });
});

describe('processStepOutput', () => {
  it('maps a nested step-output value into context', async () => {
    const context: Record<string, unknown> = {};
    await processStepOutput({ '$.result.val': '$.output.val' }, { output: { val: 42 } }, context);
    expect(context).toEqual({ result: { val: 42 } });
  });

  it('maps the entire output via a root source path', async () => {
    const context: Record<string, unknown> = {};
    await processStepOutput({ '$.everything': '$' }, { a: 1, b: 2 }, context);
    expect(context.everything).toEqual({ a: 1, b: 2 });
  });

  it('leaves context untouched and warns when source resolves to undefined', async () => {
    const context: Record<string, unknown> = { keep: true };
    const events = await processStepOutput({ '$.x': '$.missing' }, { other: 1 }, context);
    expect(context).toEqual({ keep: true });
    expect(events.some((e) => e.status === MappingEventStatus.WARN)).toBe(true);
  });

  it('hydrates offloaded output before extracting a nested property', async () => {
    s3Json({ payload: 'hello' });
    const context: Record<string, unknown> = {};
    await processStepOutput({ '$.x': '$.payload' }, pointer(), context);
    expect(context.x).toBe('hello');
    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
  });
});
