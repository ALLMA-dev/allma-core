import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

// The real axiosInstance throws at import time if VITE_API_BASE_URL is unset and pulls in
// Amplify auth — replace the whole module with a method stub. This is the one API seam.
vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
// Notifications need a provider to render for real; assert on the call instead.
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import { useGetFlows, useGetFlowConfig, useCreateFlow } from '../../../src/api/flowService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockNotify = vi.mocked(notifications.show);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGetFlows', () => {
  it('requests the versioned flows route with query params and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 'f1' }]));

    const { result } = renderHook(() => useGetFlows({ searchText: 'abc', tag: 't1' }), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'f1' }]);
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.FLOWS}?searchText=abc&tag=t1`);
  });

  it('surfaces the server error message when the envelope reports failure', async () => {
    mockGet.mockResolvedValue(apiFail('boom'));

    const { result } = renderHook(() => useGetFlows({}), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useGetFlowConfig', () => {
  it('does not fire while the flowId is undefined (disabled query)', async () => {
    const { result } = renderHook(() => useGetFlowConfig(undefined), {
      wrapper: createHookWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the detail route once a flowId is supplied', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 'f1', name: 'Flow One' }));

    const { result } = renderHook(() => useGetFlowConfig('f1'), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.FLOW_CONFIG_DETAIL('f1')}`);
  });
});

describe('useCreateFlow', () => {
  it('posts the new flow and shows a success notification on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'f1', name: 'My Flow' }));

    const { result } = renderHook(() => useCreateFlow(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'My Flow' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.FLOWS}`, { name: 'My Flow' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Flow Created', color: 'green' }),
    );
  });

  it('shows an error notification when creation fails', async () => {
    mockPost.mockResolvedValue(apiFail('duplicate name'));

    const { result } = renderHook(() => useCreateFlow(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'dupe' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation Failed', color: 'red' }),
    );
  });
});
