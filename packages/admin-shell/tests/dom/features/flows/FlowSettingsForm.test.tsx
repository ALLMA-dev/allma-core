import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import type { FlowMetadataStorageItem } from '@allma/core-types';

vi.mock('../../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../../src/api/axiosInstance.js';
import { FlowSettingsForm } from '../../../../src/features/flows/components/FlowSettingsForm.js';
import { renderWithProviders } from '../../../_helpers/render.js';
import { apiOk } from '../../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);
const mockPut = vi.mocked(axiosInstance.put);
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

const flowConfig = {
  id: 'flow-1',
  name: 'My Flow',
  description: 'A flow',
  tags: ['t1'],
  flowVariables: {},
} as unknown as FlowMetadataStorageItem;

beforeEach(() => {
  vi.clearAllMocks();
  // useGetAllFlowTags
  mockGet.mockResolvedValue(apiOk(['t1', 't2']));
});

describe('FlowSettingsForm', () => {
  it('renders an error alert when the flow config could not be loaded', () => {
    renderWithProviders(
      <FlowSettingsForm flowId="flow-1" flowConfig={undefined} isLoading={false} />,
    );
    expect(screen.getByText(/Could not load flow settings/i)).toBeInTheDocument();
  });

  it('seeds the fields from the flow config and keeps Save disabled until edited', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FlowSettingsForm flowId="flow-1" flowConfig={flowConfig} isLoading={false} />,
    );

    expect(await screen.findByDisplayValue('My Flow')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /Save Settings/i });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/Flow Name/i), ' Updated');
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('submits the edited settings to the flow-config detail route', async () => {
    mockPut.mockResolvedValue(apiOk({ ...flowConfig, name: 'My Flow Updated' }));
    const user = userEvent.setup();
    renderWithProviders(
      <FlowSettingsForm flowId="flow-1" flowConfig={flowConfig} isLoading={false} />,
    );

    await screen.findByDisplayValue('My Flow');
    await user.type(screen.getByLabelText(/Flow Name/i), ' Updated');
    await user.click(screen.getByRole('button', { name: /Save Settings/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut).toHaveBeenCalledWith(
      `/${V}${R.FLOW_CONFIG_DETAIL('flow-1')}`,
      expect.objectContaining({ name: 'My Flow Updated' }),
    );
  });
});
