import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import { ImportModal } from '../../../../src/features/shared/ImportModal.js';
import { renderWithProviders } from '../../../_helpers/render.js';
import { apiOk } from '../../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const mockNotify = vi.mocked(notifications.show);
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImportModal', () => {
  it('warns and does not import when no file is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImportModal opened onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Start Import/i }));

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No file selected', color: 'red' }),
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('parses a selected JSON file, posts it with the overwrite option, and closes', async () => {
    mockPost.mockResolvedValue(
      apiOk({
        created: { flows: 0, steps: 0, prompts: 0, agents: 0 },
        updated: { flows: 0, steps: 0, prompts: 0, agents: 0 },
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ImportModal opened onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([JSON.stringify({ flows: [{ id: 'f1' }] })], 'export.json', {
      type: 'application/json',
    });
    await user.upload(fileInput, file);

    await user.click(screen.getByLabelText(/Overwrite existing items/i));
    await user.click(screen.getByRole('button', { name: /Start Import/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.IMPORT}`, {
      flows: [{ id: 'f1' }],
      options: { overwrite: true },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('warns when the selected file is not valid JSON', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImportModal opened onClose={() => {}} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not json at all'], 'broken.json', { type: 'application/json' });
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /Start Import/i }));

    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Invalid File', color: 'red' }),
      ),
    );
    expect(mockPost).not.toHaveBeenCalled();
  });
});
