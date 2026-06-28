import { describe, it, expect } from 'vitest';
import { defineFlow, startSubFlow, endFlow, noOp, external, resolveReferences } from './index.js';

function flowWithSubFlowRef(id: string, subFlowDefinitionId: string) {
  const flow = defineFlow({ id });
  const s = flow.steps({
    start: startSubFlow({ subFlowDefinitionId }),
    done: endFlow(),
  });
  s.start.next(s.done);
  flow.start(s.start);
  return flow.build();
}

describe('cross-artifact resolution', () => {
  it('flags a dangling sub-flow reference', () => {
    const issues = resolveReferences([flowWithSubFlowRef('parent', 'does-not-exist')]);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('flow');
    expect(issues[0].id).toBe('does-not-exist');
  });

  it('resolves a reference to another flow in the same set', () => {
    const child = (() => {
      const f = defineFlow({ id: 'child-flow' });
      const s = f.steps({ only: noOp() });
      f.start(s.only);
      return f.build();
    })();
    const issues = resolveReferences([flowWithSubFlowRef('parent', 'child-flow'), child]);
    expect(issues).toHaveLength(0);
  });

  it('treats external(...) ids as resolved', () => {
    const issues = resolveReferences([flowWithSubFlowRef('parent', external('platform-managed-flow'))]);
    expect(issues).toHaveLength(0);
  });

  it('resolves against a known catalog (e.g. prompts/flows from JSON artifacts)', () => {
    const issues = resolveReferences([flowWithSubFlowRef('parent', 'json-defined-flow')], {
      flowIds: new Set(['json-defined-flow']),
    });
    expect(issues).toHaveLength(0);
  });
});
