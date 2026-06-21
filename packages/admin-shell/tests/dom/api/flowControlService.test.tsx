import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

// useStatefulRedrive navigates to the new execution on success — assert on the mock.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import { useStatefulRedrive, useSandboxStep } from '../../../src/api/flowControlService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const mockNotify = vi.mocked(notifications.show);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStatefulRedrive', () => {
  it('posts to the redrive route, notifies, and navigates to the new execution', async () => {
    mockPost.mockResolvedValue(apiOk({ newFlowExecutionId: 'ex2' }));

    const { result } = renderHook(() => useStatefulRedrive(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ executionId: 'ex1', data: { stepId: 's3' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      `/${V}${R.FLOW_EXECUTION_STATEFUL_REDRIVE('ex1')}`,
      { stepId: 's3' },
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Redrive Initiated', color: 'green' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/executions/ex2');
  });

  it('notifies and does not navigate when the redrive fails', async () => {
    mockPost.mockResolvedValue(apiFail('bad context'));

    const { result } = renderHook(() => useStatefulRedrive(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ executionId: 'ex1', data: {} } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Redrive Failed', color: 'red' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('useSandboxStep', () => {
  it('posts to the sandbox route and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ output: {} }));

    const { result } = renderHook(() => useSandboxStep(), { wrapper: createHookWrapper() });
    result.current.mutate({ stepInstance: {}, mockContext: {} } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.FLOW_SANDBOX_STEP}`, {
      stepInstance: {},
      mockContext: {},
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sandbox Run Successful', color: 'green' }),
    );
  });

  it('notifies on a sandbox failure', async () => {
    mockPost.mockResolvedValue(apiFail('step threw'));

    const { result } = renderHook(() => useSandboxStep(), { wrapper: createHookWrapper() });
    result.current.mutate({ stepInstance: {}, mockContext: {} } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sandbox Run Failed', color: 'red' }),
    );
  });
});
