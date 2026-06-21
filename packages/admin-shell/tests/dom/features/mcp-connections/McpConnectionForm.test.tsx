import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, zodResolver } from '@mantine/form';
import { CreateMcpConnectionInputSchema, type CreateMcpConnectionInput } from '@allma/core-types';

import { McpConnectionForm } from '../../../../src/features/mcp-connections/components/McpConnectionForm.js';
import { renderWithProviders } from '../../../_helpers/render.js';

// Mirror the create page: a real form with the same zod validation so we exercise the real
// validation + submit contract.
function Harness({ onSubmit }: { onSubmit: (v: CreateMcpConnectionInput) => void }): JSX.Element {
  const form = useForm<CreateMcpConnectionInput>({
    initialValues: {
      name: '',
      serverUrl: '',
      authentication: { type: 'NONE' },
    } as CreateMcpConnectionInput,
    validate: zodResolver(CreateMcpConnectionInputSchema),
  });
  return <McpConnectionForm form={form} onSubmit={onSubmit} onCancel={() => {}} isSubmitting={false} />;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('McpConnectionForm', () => {
  it('reflects typed values in the controlled fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    const name = screen.getByLabelText(/Connection Name/i);
    const url = screen.getByLabelText(/Server URL/i);
    await user.type(name, 'Internal API');
    await user.type(url, 'https://api.example.com');

    expect(name).toHaveValue('Internal API');
    expect(url).toHaveValue('https://api.example.com');
  });

  it('reveals the secret fields only when an auth type that needs them is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/AWS Secret ARN/i)).not.toBeInTheDocument();

    await user.click(screen.getByText('Bearer Token'));

    expect(await screen.findByLabelText(/AWS Secret ARN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Secret JSON Key/i)).toBeInTheDocument();
  });

  it('blocks submit and flags the invalid server URL when it is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /Save Connection/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Server URL/i)).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the values once the required fields are provided', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Connection Name/i), 'Internal API');
    await user.type(screen.getByLabelText(/Server URL/i), 'https://api.example.com');
    await user.click(screen.getByRole('button', { name: /Save Connection/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Internal API',
      serverUrl: 'https://api.example.com',
    });
  });
});
