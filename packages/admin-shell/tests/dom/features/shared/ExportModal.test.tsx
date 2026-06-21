import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import axiosInstance from '../../../../src/api/axiosInstance.js';
import { ExportModal } from '../../../../src/features/shared/ExportModal.js';
import { renderWithProviders } from '../../../_helpers/render.js';
import { apiOk } from '../../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

const items = [
  { id: 'f1', name: 'Alpha Flow' },
  { id: 'f2', name: 'Beta Flow' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExportModal', () => {
  it('titles itself from the item type and lists every item', () => {
    renderWithProviders(
      <ExportModal opened onClose={() => {}} items={items} itemType="flow" />,
    );

    expect(screen.getByText('Export Flows')).toBeInTheDocument();
    expect(screen.getByLabelText('Alpha Flow')).toBeInTheDocument();
    expect(screen.getByLabelText('Beta Flow')).toBeInTheDocument();
  });

  it('filters the list by the search term', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ExportModal opened onClose={() => {}} items={items} itemType="flow" />,
    );

    await user.type(screen.getByPlaceholderText('Search...'), 'Alpha');

    expect(screen.getByLabelText('Alpha Flow')).toBeInTheDocument();
    expect(screen.queryByLabelText('Beta Flow')).not.toBeInTheDocument();
  });

  it('keeps the export button disabled until at least one item is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ExportModal opened onClose={() => {}} items={items} itemType="flow" />,
    );

    expect(screen.getByRole('button', { name: /Export Selected \(0\)/i })).toBeDisabled();

    await user.click(screen.getByLabelText('Alpha Flow'));

    expect(screen.getByRole('button', { name: /Export Selected \(1\)/i })).toBeEnabled();
  });

  it('exports the selected ids under the key matching the item type and closes', async () => {
    mockPost.mockResolvedValue(apiOk({ flows: [], version: '1' }));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ExportModal opened onClose={onClose} items={items} itemType="flow" />,
    );

    await user.click(screen.getByLabelText('Beta Flow'));
    await user.click(screen.getByRole('button', { name: /Export Selected \(1\)/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.EXPORT}`, { flowIds: ['f2'] });
    expect(onClose).toHaveBeenCalled();
  });
});
