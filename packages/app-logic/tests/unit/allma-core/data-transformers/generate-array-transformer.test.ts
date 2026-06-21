import { describe, it, expect } from 'vitest';
import { executeGenerateArrayTransformer as run } from '../../../../src/allma-core/data-transformers/generate-array-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

describe('generate-array-transformer', () => {
  it('generates a zero-based index array of the given length', async () => {
    const { outputData } = await exec({ count: 3 });
    expect(outputData?.array).toEqual([0, 1, 2]);
  });

  it('returns an empty array for count 0', async () => {
    const { outputData } = await exec({ count: 0 });
    expect(outputData?.array).toEqual([]);
  });

  it('throws on negative or non-integer count', async () => {
    await expect(exec({ count: -1 })).rejects.toThrow(/Invalid input/);
    await expect(exec({ count: 1.5 })).rejects.toThrow(/Invalid input/);
    await expect(exec({})).rejects.toThrow(/Invalid input/);
  });
});
