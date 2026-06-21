import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

// The real axiosInstance throws at import time without VITE_API_BASE_URL and pulls in
// Amplify auth — replace the whole module with a method stub. This is the one API seam.
vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import {
  useGetAgents,
  useGetAgent,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
} from '../../../src/api/agentService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockPut = vi.mocked(axiosInstance.put);
const mockDelete = vi.mocked(axiosInstance.delete);
const mockNotify = vi.mocked(notifications.show);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGetAgents', () => {
  it('requests the versioned agents route and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 'a1' }]));

    const { result } = renderHook(() => useGetAgents(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'a1' }]);
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.AGENTS}`);
  });

  it('surfaces the server error message on failure', async () => {
    mockGet.mockResolvedValue(apiFail('boom'));

    const { result } = renderHook(() => useGetAgents(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useGetAgent', () => {
  it('stays idle while the agentId is undefined (disabled query)', () => {
    const { result } = renderHook(() => useGetAgent(undefined), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the detail route once an agentId is supplied', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 'a1', name: 'Agent One' }));

    const { result } = renderHook(() => useGetAgent('a1'), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.AGENT_DETAIL('a1')}`);
  });
});

describe('useCreateAgent', () => {
  it('posts the new agent and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'a1', name: 'New' }));

    const { result } = renderHook(() => useCreateAgent(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'New' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.AGENTS}`, { name: 'New' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent Created', color: 'green' }),
    );
  });

  it('shows an error notification when creation fails', async () => {
    mockPost.mockResolvedValue(apiFail('duplicate'));

    const { result } = renderHook(() => useCreateAgent(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'dupe' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation Failed', color: 'red' }),
    );
  });
});

describe('useUpdateAgent', () => {
  it('puts to the detail route and notifies on success', async () => {
    mockPut.mockResolvedValue(apiOk({ id: 'a1', name: 'Renamed' }));

    const { result } = renderHook(() => useUpdateAgent(), { wrapper: createHookWrapper() });
    result.current.mutate({ agentId: 'a1', data: { name: 'Renamed' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith(`/${V}${R.AGENT_DETAIL('a1')}`, { name: 'Renamed' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent Updated', color: 'blue' }),
    );
  });
});

describe('useDeleteAgent', () => {
  it('deletes the detail route and notifies on success', async () => {
    mockDelete.mockResolvedValue(apiOk(undefined));

    const { result } = renderHook(() => useDeleteAgent(), { wrapper: createHookWrapper() });
    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith(`/${V}${R.AGENT_DETAIL('a1')}`);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent Deleted', color: 'orange' }),
    );
  });

  it('throws and notifies when the envelope reports failure', async () => {
    mockDelete.mockResolvedValue(apiFail('in use'));

    const { result } = renderHook(() => useDeleteAgent(), { wrapper: createHookWrapper() });
    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deletion Failed', color: 'red' }),
    );
  });
});
