import { describe, it, expect } from 'vitest';
import { executeJoinDataTransformer as run } from '../../../../src/allma-core/data-transformers/join-data-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

const base = {
  left_format: 'json' as const,
  right_format: 'json' as const,
  output_format: 'json' as const,
};

describe('join-data-transformer — JSON joins', () => {
  it('performs an inner join on a shared key', async () => {
    const { outputData } = await exec({
      ...base,
      left_source: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
      right_source: [{ id: 1, val: 'x' }],
      join_keys: ['id'],
      join_type: 'inner',
    });
    expect(outputData?.result).toEqual([{ id: 1, name: 'a', val: 'x' }]);
    expect(outputData?.rowCount).toBe(1);
  });

  it('performs a left join keeping unmatched left rows with null right columns', async () => {
    const { outputData } = await exec({
      ...base,
      left_source: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
      right_source: [{ id: 1, val: 'x' }],
      join_keys: ['id'],
      join_type: 'left',
    });
    expect(outputData?.result).toEqual([
      { id: 1, name: 'a', val: 'x' },
      { id: 2, name: 'b', val: null },
    ]);
  });

  it('performs a right join populating key columns from unmatched right rows', async () => {
    const { outputData } = await exec({
      ...base,
      left_source: [{ id: 1, name: 'a' }],
      right_source: [{ id: 2, val: 'y' }],
      join_keys: ['id'],
      join_type: 'right',
    });
    expect(outputData?.result).toEqual([{ id: 2, name: null, val: 'y' }]);
    expect(outputData?.rowCount).toBe(1);
  });

  it('supports key_mappings for differently-named keys', async () => {
    const { outputData } = await exec({
      ...base,
      left_source: [{ mgr: 1, team: 'A' }],
      right_source: [{ id: 1, dept: 'Eng' }],
      key_mappings: [{ left: 'mgr', right: 'id' }],
      join_type: 'inner',
    });
    expect(outputData?.result).toEqual([{ mgr: 1, team: 'A', dept: 'Eng' }]);
  });

  it('returns an empty result for an inner join when left is empty', async () => {
    const { outputData } = await exec({
      ...base,
      left_source: [],
      right_source: [{ id: 1 }],
      join_keys: ['id'],
      join_type: 'inner',
    });
    expect(outputData?.result).toEqual([]);
    expect(outputData?.rowCount).toBe(0);
  });
});

describe('join-data-transformer — CSV', () => {
  it('parses CSV inputs and emits CSV output', async () => {
    const { outputData } = await exec({
      left_format: 'csv',
      right_format: 'csv',
      output_format: 'csv',
      left_source: 'id,name\n1,Alice\n2,Bob',
      right_source: 'id,age\n1,30',
      join_keys: ['id'],
      join_type: 'inner',
    });
    expect(outputData?.result).toBe('id,name,age\n1,Alice,30');
    expect(outputData?.rowCount).toBe(1);
  });
});

describe('join-data-transformer — validation', () => {
  it('throws when both join_keys and key_mappings are provided (XOR)', async () => {
    await expect(
      exec({
        ...base,
        left_source: [{ id: 1 }],
        right_source: [{ id: 1 }],
        join_keys: ['id'],
        key_mappings: [{ left: 'id', right: 'id' }],
        join_type: 'inner',
      }),
    ).rejects.toThrow(/Invalid input for join-data/);
  });

  it('throws when neither join_keys nor key_mappings is provided', async () => {
    await expect(
      exec({ ...base, left_source: [{ id: 1 }], right_source: [{ id: 1 }], join_type: 'inner' }),
    ).rejects.toThrow(/Invalid input for join-data/);
  });

  it('throws when data type does not match the declared format', async () => {
    await expect(
      exec({ ...base, left_format: 'csv', left_source: [{ id: 1 }], right_source: [{ id: 1 }], join_keys: ['id'], join_type: 'inner' }),
    ).rejects.toThrow(/Invalid input for join-data/);
  });

  it('throws when a join key is missing from a data source', async () => {
    await expect(
      exec({ ...base, left_source: [{ id: 1 }], right_source: [{ other: 1 }], join_keys: ['id'], join_type: 'inner' }),
    ).rejects.toThrow(/not found in right data source/);
  });
});
