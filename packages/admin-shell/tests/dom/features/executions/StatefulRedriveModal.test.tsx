import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
// EditableJsonView is a heavy editor from ui-components; stub it so the test stays focused on
// the modal's redrive contract.
vi.mock('@allma/ui-components', () => ({
  EditableJsonView: ({ value }: { value: unknown }) => (
    <div data-testid="json-view">{JSON.stringify(value)}</div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import axiosInstance from '../../../../src/api/axiosInstance.js';
import { StatefulRedriveModal } from '../../../../src/features/executions/components/StatefulRedriveModal.js';
import { renderWithProviders } from '../../../_helpers/render.js';
import { apiOk } from '../../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

const step = {
  stepInstanceId: 'step-7',
  inputMappingContext: { user: 'alice' },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StatefulRedriveModal', () => {
  it('titles itself with the step and seeds the editor with the step input context', () => {
    renderWithProviders(
      <StatefulRedriveModal opened onClose={() => {}} step={step} executionId="ex-1" />,
    );

    expect(screen.getByText(/Redrive from Step: step-7/i)).toBeInTheDocument();
    expect(screen.getByTestId('json-view')).toHaveTextContent('{"user":"alice"}');
  });

  it('posts the redrive payload built from the step and closes on success', async () => {
    mockPost.mockResolvedValue(apiOk({ newFlowExecutionId: 'ex-2' }));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <StatefulRedriveModal opened onClose={onClose} step={step} executionId="ex-1" />,
    );

    await user.click(screen.getByRole('button', { name: /Confirm and Redrive/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.FLOW_EXECUTION_STATEFUL_REDRIVE('ex-1')}`, {
      startFromStepInstanceId: 'step-7',
      modifiedContextData: { user: 'alice' },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
