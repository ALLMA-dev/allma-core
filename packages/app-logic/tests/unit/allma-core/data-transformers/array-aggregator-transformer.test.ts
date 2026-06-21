import { describe, it, expect } from 'vitest';
import { executeArrayAggregatorTransformer as run } from '../../../../src/allma-core/data-transformers/array-aggregator-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

describe('array-aggregator-transformer', () => {
  it.each([
    ['sum', [1, 2, 3], 6],
    ['min', [3, 1, 2], 1],
    ['max', [3, 1, 2], 3],
    ['avg', [2, 4, 6], 4],
  ])('computes %s over a numeric array', async (operation, array, expected) => {
    const { outputData } = await exec({ array, operation });
    expect(outputData?.result).toBe(expected);
  });

  it('extracts numeric values via path before aggregating', async () => {
    const { outputData } = await exec({ array: [{ n: 10 }, { n: 20 }], path: 'n', operation: 'sum' });
    expect(outputData?.result).toBe(30);
  });

  it('coerces booleans to 1/0', async () => {
    const { outputData } = await exec({ array: [true, true, false], operation: 'sum' });
    expect(outputData?.result).toBe(2);
  });

  it('returns 0 for sum over an empty array, null for others', async () => {
    expect((await exec({ array: [], operation: 'sum' })).outputData?.result).toBe(0);
    expect((await exec({ array: [], operation: 'max' })).outputData?.result).toBeNull();
  });

  it('returns 0/null when no numeric values are found', async () => {
    expect((await exec({ array: ['a', 'b'], operation: 'sum' })).outputData?.result).toBe(0);
    expect((await exec({ array: ['a', 'b'], operation: 'avg' })).outputData?.result).toBeNull();
  });

  it('throws on invalid input', async () => {
    await expect(exec({ array: 'not-an-array', operation: 'sum' })).rejects.toThrow(/Invalid input/);
    await expect(exec({ array: [1], operation: 'median' })).rejects.toThrow(/Invalid input/);
  });
});
