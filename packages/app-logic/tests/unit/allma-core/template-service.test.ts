import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { MappingEventStatus, MappingEventType, type TemplateContextMappingItem } from '@allma/core-types';
import { TemplateService } from '../../../src/allma-core/template-service.js';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

/**
 * Unit tests for the Handlebars-based TemplateService: built-in helpers, output coercion,
 * S3-aware context hydration, and declarative context building from JSONPath mappings.
 */

const s3Mock = mockClient(S3Client);
const s3Json = (payload: unknown) =>
  s3Mock.on(GetObjectCommand).resolves({
    ContentType: 'application/json',
    ContentLength: 256,
    Body: { transformToString: async () => JSON.stringify(payload) } as never,
  });

const svc = TemplateService.getInstance();
const cid = 'test-correlation';
const mapping = (m: Partial<TemplateContextMappingItem> & { sourceJsonPath: string }): TemplateContextMappingItem =>
  ({ formatAs: 'RAW', joinSeparator: '\n', ...m });

beforeEach(() => resetAwsClientMocks(s3Mock));
afterEach(() => resetAwsClientMocks(s3Mock));

describe('TemplateService.getInstance', () => {
  it('returns a singleton', () => {
    expect(TemplateService.getInstance()).toBe(svc);
  });
});

describe('TemplateService.render — basics', () => {
  it('interpolates a simple variable', async () => {
    expect(await svc.render('Hello {{name}}', { name: 'Ada' }, cid)).toBe('Hello Ada');
  });

  it('coerces numbers and booleans to strings', async () => {
    expect(await svc.render('{{n}}', { n: 5 }, cid)).toBe('5');
    expect(await svc.render('{{b}}', { b: true }, cid)).toBe('true');
  });

  it('renders missing variables leniently as empty', async () => {
    expect(await svc.render('[{{missing}}]', {}, cid)).toBe('[]');
  });
});

describe('TemplateService.render — helpers', () => {
  it('json helper stringifies compactly', async () => {
    expect(await svc.render('{{json obj}}', { obj: { a: 1, b: [2] } }, cid)).toBe('{"a":1,"b":[2]}');
  });

  it('json helper handles null and strings', async () => {
    expect(await svc.render('{{json x}}', { x: null }, cid)).toBe('null');
    expect(await svc.render('{{json x}}', { x: 'raw' }, cid)).toBe('raw');
  });

  it('slice helper slices arrays (explicit start and end)', async () => {
    expect(await svc.render('{{#each (slice arr 0 2)}}{{this}}{{/each}}', { arr: [1, 2, 3] }, cid)).toBe('12');
  });

  it('slice helper returns empty for a non-array', async () => {
    expect(await svc.render('[{{#each (slice notArr 0 2)}}{{this}}{{/each}}]', { notArr: 'x' }, cid)).toBe('[]');
  });

  it('eq/neq/gt/lt comparison helpers', async () => {
    expect(await svc.render('{{#if (eq s "A")}}y{{else}}n{{/if}}', { s: 'A' }, cid)).toBe('y');
    expect(await svc.render('{{#if (neq s "A")}}y{{else}}n{{/if}}', { s: 'A' }, cid)).toBe('n');
    expect(await svc.render('{{#if (gt n 5)}}y{{else}}n{{/if}}', { n: 9 }, cid)).toBe('y');
    expect(await svc.render('{{#if (lt n 5)}}y{{else}}n{{/if}}', { n: 9 }, cid)).toBe('n');
  });

  it('default helper falls back when value is missing', async () => {
    expect(await svc.render('{{default name "Guest"}}', {}, cid)).toBe('Guest');
    expect(await svc.render('{{default name "Guest"}}', { name: 'Ada' }, cid)).toBe('Ada');
  });

  it('base64 helper encodes strings', async () => {
    expect(await svc.render('{{base64 "user:pass"}}', {}, cid)).toBe('dXNlcjpwYXNz');
  });

  it('with_json_path exposes a JSONPath result as a block param', async () => {
    const out = await svc.render(
      '{{#with_json_path "$.items[*].v" as |vals|}}{{#each vals}}{{this}},{{/each}}{{/with_json_path}}',
      { items: [{ v: 1 }, { v: 2 }] },
      cid,
    );
    expect(out).toBe('1,2,');
  });
});

describe('TemplateService.render — S3-aware context', () => {
  it('hydrates an S3 pointer in the context before rendering', async () => {
    s3Json({ name: 'Ada' });
    const out = await svc.render('Hi {{user.name}}', { user: { _s3_output_pointer: { bucket: 'b', key: 'k' } } }, cid);
    expect(out).toBe('Hi Ada');
    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  });
});

describe('TemplateService.buildContextFromMappings', () => {
  it('returns empty context when mappings are undefined', async () => {
    const { context, events } = await svc.buildContextFromMappings(undefined, {}, cid);
    expect(context).toEqual({});
    expect(events).toEqual([]);
  });

  it('maps a RAW value and emits a SUCCESS event', async () => {
    const { context, events } = await svc.buildContextFromMappings(
      { greeting: mapping({ sourceJsonPath: '$.msg' }) },
      { msg: 'hello' },
      cid,
    );
    expect(context).toEqual({ greeting: 'hello' });
    expect(events.some((e) => e.type === MappingEventType.TEMPLATE_CONTEXT_MAPPING && e.status === MappingEventStatus.SUCCESS)).toBe(true);
  });

  it('omits undefined sources with a WARN event', async () => {
    const { context, events } = await svc.buildContextFromMappings(
      { x: mapping({ sourceJsonPath: '$.nope' }) },
      { other: 1 },
      cid,
    );
    expect(context).toEqual({});
    expect(events.some((e) => e.status === MappingEventStatus.WARN)).toBe(true);
  });

  it('formats a value as JSON', async () => {
    const { context } = await svc.buildContextFromMappings(
      { data: mapping({ sourceJsonPath: '$.obj', formatAs: 'JSON' }) },
      { obj: { a: 1 } },
      cid,
    );
    expect(context.data).toBe('{"a":1}');
  });

  it('applies selectFields to an array of objects', async () => {
    const { context } = await svc.buildContextFromMappings(
      { picked: mapping({ sourceJsonPath: '$.rows', selectFields: ['id'] }) },
      { rows: [{ id: 1, secret: 'x' }, { id: 2, secret: 'y' }] },
      cid,
    );
    expect(context.picked).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('formats an array via CUSTOM_STRING + itemTemplate', async () => {
    const { context } = await svc.buildContextFromMappings(
      { lines: mapping({ sourceJsonPath: '$.rows', formatAs: 'CUSTOM_STRING', itemTemplate: '- {{name}}', joinSeparator: '\n' }) },
      { rows: [{ name: 'a' }, { name: 'b' }] },
      cid,
    );
    expect(context.lines).toBe('- a\n- b');
  });

  it('falls back to raw value when CUSTOM_STRING data is not an array', async () => {
    const { context } = await svc.buildContextFromMappings(
      { v: mapping({ sourceJsonPath: '$.scalar', formatAs: 'CUSTOM_STRING', itemTemplate: '{{x}}' }) },
      { scalar: 'plain' },
      cid,
    );
    expect(context.v).toBe('plain');
  });

  it('records an ERROR event when path resolution throws', async () => {
    const { context, events } = await svc.buildContextFromMappings(
      { v: mapping({ sourceJsonPath: '$.map[$.missing]' }) },
      { map: {} },
      cid,
    );
    expect(context).toEqual({});
    expect(events.some((e) => e.status === MappingEventStatus.ERROR)).toBe(true);
  });
});
