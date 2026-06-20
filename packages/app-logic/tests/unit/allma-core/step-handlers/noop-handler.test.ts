import { describe, it, expect } from 'vitest';
import { handleNoOp } from '../../../../src/allma-core/step-handlers/noop-handler.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

/**
 * The NO_OP handler is the simplest contract in the system: it passes its input straight
 * through and appends a success message. It anchors the registry warm-up commit.
 */
describe('handleNoOp', () => {
  it('passes the input through and appends a success message', async () => {
    const stepDefinition = { name: 'my-noop' } as never;
    const result = await handleNoOp(stepDefinition, { a: 1, b: 'two' }, makeRuntimeState());

    expect(result.outputData).toEqual({
      a: 1,
      b: 'two',
      message: "NO_OP step 'my-noop' executed successfully.",
    });
  });

  it('handles empty input without dropping the message', async () => {
    const result = await handleNoOp({ name: 'empty' } as never, {}, makeRuntimeState());
    expect(result.outputData).toEqual({
      message: "NO_OP step 'empty' executed successfully.",
    });
  });

  it('does not mutate the original input object', async () => {
    const input = { keep: true };
    await handleNoOp({ name: 'x' } as never, input, makeRuntimeState());
    expect(input).toEqual({ keep: true });
  });
});
