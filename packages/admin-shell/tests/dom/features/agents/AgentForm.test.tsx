import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, zodResolver } from '@mantine/form';
import { CreateAgentInputSchema, type CreateAgentInput } from '@allma/core-types';

// AgentForm calls useGetFlows to populate the MultiSelect — keep the axios seam mocked so
// the component mounts without hitting the network.
vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from '../../../../src/api/axiosInstance.js';
import { AgentForm } from '../../../../src/features/agents/components/AgentForm.js';
import { renderWithProviders } from '../../../_helpers/render.js';
import { apiOk } from '../../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);

// A harness that wires AgentForm to a real @mantine/form instance with the same zod
// validation the create page uses, so we exercise the real validation + submit contract.
function Harness({ onSubmit }: { onSubmit: (values: CreateAgentInput) => void }): JSX.Element {
  const form = useForm<CreateAgentInput>({
    initialValues: { name: '', description: '', enabled: true, flowIds: [], flowVariables: {} },
    validate: zodResolver(CreateAgentInputSchema),
  });
  return <AgentForm form={form} onSubmit={onSubmit} onCancel={() => {}} isSubmitting={false} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(apiOk([{ id: 'f1', name: 'Flow One' }]));
});

describe('AgentForm', () => {
  it('reflects typed values in the controlled name field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    const name = await screen.findByLabelText(/Agent Name/i);
    await user.type(name, 'Support Bot');
    expect(name).toHaveValue('Support Bot');
  });

  it('blocks submit and shows a validation error when the name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.click(await screen.findByRole('button', { name: /Save Agent/i }));

    expect(await screen.findByText(/Agent name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the form values once the required name is provided', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.type(await screen.findByLabelText(/Agent Name/i), 'Support Bot');
    await user.click(screen.getByRole('button', { name: /Save Agent/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Support Bot', enabled: true });
  });
});
