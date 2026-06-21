import { describe, it, expect } from 'vitest';
import { executeComposeObjectTransformer as run } from '../../../../src/allma-core/data-transformers/compose-object-transformer.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const def = makeStepInstance() as never;
const rt = makeRuntimeState();

describe('compose-object-transformer', () => {
  it('packages the entire step input into outputData', async () => {
    const input = { a: 1, b: 'two', c: { nested: true } };
    const { outputData } = await run(def, input, rt);
    expect(outputData).toEqual(input);
  });

  it('returns an empty object for empty input', async () => {
    const { outputData } = await run(def, {}, rt);
    expect(outputData).toEqual({});
  });
});
