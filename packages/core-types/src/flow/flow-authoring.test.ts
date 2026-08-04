import { describe, it, expect } from 'vitest';
import { StepType } from '../common/enums.js';
import {
  FlowDefinitionSchema,
  FlowAuthoringSchema,
  applyFlowImportDefaults,
} from './core.js';

/** A minimal, structurally valid authoring-format flow (no server-owned fields, no version). */
const authoringFlow = () => ({
  id: 'test-flow',
  steps: {
    start: { stepInstanceId: 'start', stepType: StepType.NO_OP },
  },
  startStepInstanceId: 'start',
});

/** The same flow as a full, server-owned FlowDefinition. */
const fullFlow = () => ({
  ...authoringFlow(),
  version: 3,
  isPublished: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-02T00:00:00.000Z',
  publishedAt: '2026-02-02T00:00:00.000Z',
});

describe('FlowAuthoringSchema', () => {
  it('accepts a flow missing createdAt/updatedAt/publishedAt/isPublished and defaults version to 1', () => {
    const parsed = FlowAuthoringSchema.parse(authoringFlow()) as { version: number; createdAt?: unknown };
    expect(parsed.version).toBe(1);
    expect(parsed.createdAt).toBeUndefined();
  });

  it('preserves an explicit version', () => {
    const parsed = FlowAuthoringSchema.parse({ ...authoringFlow(), version: 7 }) as { version: number };
    expect(parsed.version).toBe(7);
  });

  it('still enforces cross-reference validation (dangling transition target fails)', () => {
    const broken = {
      ...authoringFlow(),
      steps: {
        start: {
          stepInstanceId: 'start',
          stepType: StepType.NO_OP,
          transitions: [{ condition: '$.x', nextStepInstanceId: 'does-not-exist' }],
        },
      },
    };
    const result = FlowAuthoringSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('still enforces a valid start step', () => {
    const result = FlowAuthoringSchema.safeParse({ ...authoringFlow(), startStepInstanceId: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('FlowDefinitionSchema backward compatibility', () => {
  it('still parses a full flow with timestamps unchanged', () => {
    const parsed = FlowDefinitionSchema.parse(fullFlow()) as { version: number; isPublished: boolean; createdAt: string };
    expect(parsed.version).toBe(3);
    expect(parsed.isPublished).toBe(true);
    expect(parsed.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects an authoring-format flow without stamping (timestamps are required)', () => {
    const result = FlowDefinitionSchema.safeParse(authoringFlow());
    expect(result.success).toBe(false);
  });
});

describe('applyFlowImportDefaults', () => {
  const now = '2026-06-28T12:00:00.000Z';

  it('stamps createdAt/updatedAt and defaults version for an authoring flow, then it passes FlowDefinitionSchema', () => {
    const stamped = applyFlowImportDefaults(authoringFlow(), now);
    expect(stamped.createdAt).toBe(now);
    expect(stamped.updatedAt).toBe(now);
    expect(stamped.version).toBe(1);
    expect(FlowDefinitionSchema.safeParse(stamped).success).toBe(true);
  });

  it('preserves existing timestamps and version (full flow passes through unchanged)', () => {
    const stamped = applyFlowImportDefaults(fullFlow(), now);
    expect(stamped.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(stamped.updatedAt).toBe('2026-02-02T00:00:00.000Z');
    expect(stamped.version).toBe(3);
  });

  it('does not mutate the input object', () => {
    const input = authoringFlow();
    applyFlowImportDefaults(input, now);
    expect('createdAt' in input).toBe(false);
  });
});
