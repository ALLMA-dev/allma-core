import { describe, it, expect } from 'vitest';
import { executeFlattenArrayTransformer as run } from '../../../../src/allma-core/data-transformers/flatten-array-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

describe('flatten-array-transformer', () => {
  it('flattens an array of arrays when no path is given', async () => {
    const { outputData } = await exec({ array: [[1, 2], [3], [4, 5]] });
    expect(outputData?.result).toEqual([1, 2, 3, 4, 5]);
  });

  it('extracts a scalar property from each object (map behavior)', async () => {
    const { outputData } = await exec({ array: [{ id: 1 }, { id: 2 }], path: 'id' });
    expect(outputData?.result).toEqual([1, 2]);
  });

  it('flattens array-valued properties (flatMap behavior)', async () => {
    const { outputData } = await exec({ array: [{ tags: ['a', 'b'] }, { tags: ['c'] }], path: 'tags' });
    expect(outputData?.result).toEqual(['a', 'b', 'c']);
  });

  it('skips null/undefined property values and non-object items', async () => {
    const { outputData } = await exec({ array: [{ v: 1 }, { v: null }, { other: 2 }, 'scalar'], path: 'v' });
    expect(outputData?.result).toEqual([1]);
  });

  it('throws on invalid input', async () => {
    await expect(exec({ array: 'nope' })).rejects.toThrow(/Invalid input/);
  });
});
