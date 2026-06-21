import { describe, it, expect } from 'vitest';
import { executeGenerateUuidTransformer as run } from '../../../../src/allma-core/data-transformers/generate-uuid-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generate-uuid-transformer', () => {
  it('generates a bare v4 UUID by default', async () => {
    const { outputData } = await exec({});
    expect(outputData?.uuid).toMatch(UUID_V4);
  });

  it('applies prefix and suffix', async () => {
    const { outputData } = await exec({ prefix: 'order-', suffix: '-v1' });
    expect(outputData?.uuid).toMatch(/^order-.+-v1$/);
    expect((outputData?.uuid as string).replace(/^order-/, '').replace(/-v1$/, '')).toMatch(UUID_V4);
  });

  it('generates unique values across calls', async () => {
    const a = (await exec({})).outputData?.uuid;
    const b = (await exec({})).outputData?.uuid;
    expect(a).not.toBe(b);
  });
});
