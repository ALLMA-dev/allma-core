import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import { useResolveS3Pointer } from '../../../src/api/systemToolsService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const mockNotify = vi.mocked(notifications.show);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useResolveS3Pointer', () => {
  it('posts the pointer wrapped in a body and returns the resolved payload', async () => {
    mockPost.mockResolvedValue(apiOk({ hydrated: true }));
    const pointer = { bucket: 'b', key: 'k' };

    const { result } = renderHook(() => useResolveS3Pointer(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate(pointer as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ hydrated: true });
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.SYSTEM_TOOLS_RESOLVE_S3}`, { pointer });
  });

  it('notifies on a resolution failure', async () => {
    mockPost.mockResolvedValue(apiFail('no such key'));

    const { result } = renderHook(() => useResolveS3Pointer(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ bucket: 'b', key: 'k' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Resolution Failed', color: 'red' }),
    );
  });
});
