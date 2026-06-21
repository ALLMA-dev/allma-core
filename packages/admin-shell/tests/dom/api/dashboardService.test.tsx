import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { useGetDashboardStats } from '../../../src/api/dashboardService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGetDashboardStats', () => {
  it('requests the dashboard stats route and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk({ totalFlows: 3 }));

    const { result } = renderHook(() => useGetDashboardStats(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalFlows: 3 });
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.DASHBOARD_STATS}`);
  });

  it('surfaces the server error message on failure', async () => {
    mockGet.mockResolvedValue(apiFail('stats down'));

    const { result } = renderHook(() => useGetDashboardStats(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('stats down');
  });
});
