import { describe, it, expect } from 'vitest';
import { executeDateTimeCalculator as run } from '../../../../src/allma-core/data-transformers/date-time-calculator.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();
const exec = (input: Record<string, unknown>) => run(def, input, rt);

const BASE = '2024-01-01T00:00:00.000Z';

describe('date-time-calculator', () => {
  it('adds an offset in seconds', async () => {
    const { outputData } = await exec({ baseTime: BASE, offsetSeconds: 3600, operation: 'add' });
    expect(outputData?.result).toBe('2024-01-01T01:00:00.000Z');
  });

  it('subtracts an offset in seconds', async () => {
    const { outputData } = await exec({ baseTime: BASE, offsetSeconds: 86400, operation: 'subtract' });
    expect(outputData?.result).toBe('2023-12-31T00:00:00.000Z');
  });

  it('supports negative offsets', async () => {
    const { outputData } = await exec({ baseTime: BASE, offsetSeconds: -60, operation: 'add' });
    expect(outputData?.result).toBe('2023-12-31T23:59:00.000Z');
  });

  it('throws on a non-ISO baseTime', async () => {
    await expect(exec({ baseTime: 'not-a-date', offsetSeconds: 1, operation: 'add' })).rejects.toThrow(/Invalid input/);
  });

  it('throws on an unsupported operation', async () => {
    await expect(exec({ baseTime: BASE, offsetSeconds: 1, operation: 'multiply' })).rejects.toThrow(/Invalid input/);
  });

  it('throws when offsetSeconds is missing', async () => {
    await expect(exec({ baseTime: BASE, operation: 'add' })).rejects.toThrow(/Invalid input/);
  });
});
