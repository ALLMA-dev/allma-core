import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from '@mantine/form';

import {
  PromptForm,
  type PromptFormValues,
} from '../../../../src/features/prompts/components/PromptForm.js';
import { renderWithProviders } from '../../../_helpers/render.js';

function Harness({
  onSubmit,
  isEditMode = true,
}: {
  onSubmit: (v: PromptFormValues) => Promise<void>;
  isEditMode?: boolean;
}): JSX.Element {
  const form = useForm<PromptFormValues>({
    initialValues: { name: '', description: '', content: '', tags: [] },
  });
  return (
    <PromptForm
      form={form}
      onSubmit={onSubmit}
      isSubmitting={false}
      isEditMode={isEditMode}
      submitButtonLabel="Save Draft"
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PromptForm', () => {
  it('keeps the submit button disabled until the form becomes dirty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    const submit = screen.getByRole('button', { name: /Save Draft/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/^Name/i), 'Analyzer');
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('only renders the content field in edit mode', () => {
    const { rerender } = renderWithProviders(<Harness onSubmit={vi.fn()} isEditMode={false} />);
    expect(screen.queryByLabelText(/Content/i)).not.toBeInTheDocument();

    rerender(<Harness onSubmit={vi.fn()} isEditMode />);
    expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
  });

  it('submits the edited values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^Name/i), 'Analyzer');
    await user.type(screen.getByLabelText(/Content/i), 'Summarize the input');
    await user.click(screen.getByRole('button', { name: /Save Draft/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Analyzer',
      content: 'Summarize the input',
    });
  });
});
