import { describe, it, expect } from 'vitest';
import type { AllmaExportFormat } from '@allma/core-types';
import {
  planDeploy,
  executeDeploy,
  definePrompt,
  defineFlow,
  noOp,
  type DeployAdapter,
  type ImportResultSummary,
  type PublishTarget,
} from './index.js';

function flowEnvelope(id: string, version = 1): AllmaExportFormat {
  const flow = defineFlow({ id, version });
  const s = flow.steps({ only: noOp() });
  flow.start(s.only);
  return flow.toExport();
}

const promptEnvelope = definePrompt({ id: 'p1', name: 'P', content: 'x' }).toExport();

/** A stubbed adapter that records calls instead of touching the network. */
function recordingAdapter(importResult: ImportResultSummary = {}) {
  const imports: { payload: AllmaExportFormat; options: { overwrite: boolean } }[] = [];
  const publishes: PublishTarget[] = [];
  const adapter: DeployAdapter = {
    importConfig: async (payload, options) => {
      imports.push({ payload, options });
      return importResult;
    },
    publishFlow: async (flowId, version) => {
      publishes.push({ flowId, version });
    },
  };
  return { adapter, imports, publishes };
}

describe('planDeploy', () => {
  it('merges every artifact array across envelopes into one import payload', () => {
    const plan = planDeploy([flowEnvelope('a'), flowEnvelope('b'), promptEnvelope]);
    expect(plan.import.flows?.map((f) => f.id)).toEqual(['a', 'b']);
    expect(plan.import.promptTemplates?.map((p) => p.id)).toEqual(['p1']);
    expect(plan.importOptions.overwrite).toBe(true);
    expect(plan.publish).toEqual([]);
  });

  it('computes publish targets from flow ids/versions when publish is set', () => {
    const plan = planDeploy([flowEnvelope('a', 3)], { publish: true });
    expect(plan.publish).toEqual([{ flowId: 'a', version: 3 }]);
  });

  it('honors an explicit overwrite=false', () => {
    expect(planDeploy([flowEnvelope('a')], { overwrite: false }).importOptions.overwrite).toBe(false);
  });
});

describe('executeDeploy', () => {
  it('imports once and publishes each target', async () => {
    const plan = planDeploy([flowEnvelope('a', 2)], { publish: true });
    const { adapter, imports, publishes } = recordingAdapter();
    const result = await executeDeploy(plan, adapter);

    expect(imports).toHaveLength(1);
    expect(imports[0].options).toEqual({ overwrite: true });
    expect(publishes).toEqual([{ flowId: 'a', version: 2 }]);
    expect(result.published).toEqual([{ flowId: 'a', version: 2 }]);
  });

  it('does not publish when the import reported per-item errors', async () => {
    const plan = planDeploy([flowEnvelope('a')], { publish: true });
    const { adapter, publishes } = recordingAdapter({
      errors: [{ id: 'a', type: 'flow', message: 'version 1 does not exist' }],
    });
    const result = await executeDeploy(plan, adapter);

    expect(publishes).toEqual([]);
    expect(result.published).toEqual([]);
    expect(result.import.errors).toHaveLength(1);
  });

  it('skips publishing entirely when publish is not requested', async () => {
    const plan = planDeploy([flowEnvelope('a')]);
    const { adapter, imports, publishes } = recordingAdapter();
    await executeDeploy(plan, adapter);
    expect(imports).toHaveLength(1);
    expect(publishes).toEqual([]);
  });
});
