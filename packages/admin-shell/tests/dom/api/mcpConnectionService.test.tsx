import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import {
  useGetMcpConnections,
  useGetMcpConnection,
  useCreateMcpConnection,
  useUpdateMcpConnection,
  useDeleteMcpConnection,
  useDiscoverTools,
} from '../../../src/api/mcpConnectionService.js';
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

describe('useGetMcpConnections', () => {
  it('requests the versioned connections route and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 'm1' }]));

    const { result } = renderHook(() => useGetMcpConnections(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'm1' }]);
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTIONS}`);
  });

  it('surfaces the server error message on failure', async () => {
    mockGet.mockResolvedValue(apiFail('boom'));

    const { result } = renderHook(() => useGetMcpConnections(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useGetMcpConnection', () => {
  it('stays idle while the id is undefined (disabled query)', () => {
    const { result } = renderHook(() => useGetMcpConnection(undefined), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the detail route once an id is supplied', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 'm1' }));

    const { result } = renderHook(() => useGetMcpConnection('m1'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTION_DETAIL('m1')}`);
  });
});

describe('useCreateMcpConnection', () => {
  it('posts the new connection and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'm1' }));

    const { result } = renderHook(() => useCreateMcpConnection(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ name: 'conn' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTIONS}`, { name: 'conn' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'green' }),
    );
  });

  it('shows an error notification when creation fails', async () => {
    mockPost.mockResolvedValue(apiFail('nope'));

    const { result } = renderHook(() => useCreateMcpConnection(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ name: 'conn' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation Failed', color: 'red' }),
    );
  });
});

describe('useUpdateMcpConnection', () => {
  it('puts to the detail route and notifies on success', async () => {
    mockPut.mockResolvedValue(apiOk({ id: 'm1' }));

    const { result } = renderHook(() => useUpdateMcpConnection(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ id: 'm1', data: { name: 'updated' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTION_DETAIL('m1')}`, {
      name: 'updated',
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'green' }),
    );
  });
});

describe('useDeleteMcpConnection', () => {
  it('deletes the detail route and notifies on success', async () => {
    mockDelete.mockResolvedValue(apiOk(undefined));

    const { result } = renderHook(() => useDeleteMcpConnection(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTION_DETAIL('m1')}`);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'green' }),
    );
  });

  it('throws and notifies when the envelope reports failure', async () => {
    mockDelete.mockResolvedValue(apiFail('busy'));

    const { result } = renderHook(() => useDeleteMcpConnection(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deletion Failed', color: 'red' }),
    );
  });
});

describe('useDiscoverTools', () => {
  it('posts to the discover route and returns the tool list', async () => {
    mockPost.mockResolvedValue(apiOk([{ name: 'tool-a' }]));

    const { result } = renderHook(() => useDiscoverTools(), { wrapper: createHookWrapper() });
    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ name: 'tool-a' }]);
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.MCP_CONNECTION_DISCOVER('m1')}`);
  });

  it('notifies on a discovery failure', async () => {
    mockPost.mockResolvedValue(apiFail('unreachable'));

    const { result } = renderHook(() => useDiscoverTools(), { wrapper: createHookWrapper() });
    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discovery Failed', color: 'red' }),
    );
  });
});
