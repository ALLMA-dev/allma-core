import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from '@mantine/form';
import { StepType, type StepDefinition } from '@allma/core-types';

vi.mock('../../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
// The parameter renderer + layout pull in the full dynamic-field machinery; stub them so the
// test stays focused on the form's own General Information fields and submit contract.
vi.mock('../../../../../src/features/shared/step-form/StepFormRenderer.js', () => ({
  StepFormRenderer: () => null,
}));
vi.mock('../../../../../src/features/shared/step-form/StepFormLayout.js', () => ({
  StepFormLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="step-form-layout">{children}</div>
  ),
}));

import axiosInstance from '../../../../../src/api/axiosInstance.js';
import { StepConfigurationForm } from '../../../../../src/features/shared/step-form/StepConfigurationForm.js';
import { renderWithProviders } from '../../../../_helpers/render.js';
import { apiOk } from '../../../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);

function Harness({ onSubmit }: { onSubmit: (v: Partial<StepDefinition>) => void }): JSX.Element {
  const form = useForm<Partial<StepDefinition>>({
    initialValues: {
      name: '',
      description: '',
      stepType: StepType.NO_OP,
    },
  });
  return (
    <StepConfigurationForm
      form={form}
      onSubmit={onSubmit}
      isSubmitting={false}
      variant="create-definition"
      appliedDefinition={null}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // useGetStepDefinitions
  mockGet.mockResolvedValue(apiOk([]));
});

describe('StepConfigurationForm (create-definition variant)', () => {
  it('renders the General Information fields', async () => {
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    expect(await screen.findByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Step Type/i).length).toBeGreaterThan(0);
  });

  it('keeps Save disabled until the form is edited, then submits the values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    const save = await screen.findByRole('button', { name: /Save Changes/i });
    // The create-definition variant resets dirty on mount, so Save starts disabled.
    await waitFor(() => expect(save).toBeDisabled());

    await user.type(screen.getByLabelText(/^Name/i), 'My Step Def');
    await waitFor(() => expect(save).toBeEnabled());

    await user.click(save);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'My Step Def',
      stepType: StepType.NO_OP,
    });
  });
});
