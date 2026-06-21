import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { FlowExecutionSummary } from '@allma/core-types';

// useFlowRedrive (used for the row redrive action) lives behind the axios seam.
vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { ExecutionsTable } from '../../../../src/features/executions/components/ExecutionsTable.js';
import { renderWithProviders } from '../../../_helpers/render.js';

const makeExec = (over: Partial<FlowExecutionSummary> = {}): FlowExecutionSummary =>
  ({
    flowExecutionId: 'exec-1',
    flowDefinitionId: 'flow-1',
    flowDefinitionVersion: 3,
    status: 'SUCCEEDED',
    startTime: '2024-01-01T00:00:00.000Z',
    endTime: '2024-01-01T00:00:05.000Z',
    ...over,
  }) as FlowExecutionSummary;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExecutionsTable', () => {
  it('shows the empty-state message when there are no executions', () => {
    renderWithProviders(
      <ExecutionsTable executions={[]} isLoading={false} isRefetching={false} flowId="flow-1" />,
    );
    expect(screen.getByText(/No executions found/i)).toBeInTheDocument();
  });

  it('renders an error alert when an error is supplied', () => {
    renderWithProviders(
      <ExecutionsTable
        executions={[]}
        isLoading={false}
        isRefetching={false}
        flowId="flow-1"
        error={new Error('network down')}
      />,
    );
    expect(screen.getByText(/Could not load executions: network down/i)).toBeInTheDocument();
  });

  it('renders a row per execution with its id, version badge, and status', () => {
    const executions = [
      makeExec({ flowExecutionId: 'exec-1', status: 'SUCCEEDED', flowDefinitionVersion: 3 }),
      makeExec({ flowExecutionId: 'exec-2', status: 'FAILED', flowDefinitionVersion: 4 }),
    ];
    renderWithProviders(
      <ExecutionsTable
        executions={executions}
        isLoading={false}
        isRefetching={false}
        flowId="flow-1"
      />,
    );

    expect(screen.getByText('exec-1')).toBeInTheDocument();
    expect(screen.getByText('exec-2')).toBeInTheDocument();
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('v4')).toBeInTheDocument();
  });

  it('marks in-progress executions (no end time) in the duration column', () => {
    renderWithProviders(
      <ExecutionsTable
        executions={[makeExec({ endTime: undefined })]}
        isLoading={false}
        isRefetching={false}
        flowId="flow-1"
      />,
    );
    expect(screen.getByText('In-progress')).toBeInTheDocument();
  });
});
