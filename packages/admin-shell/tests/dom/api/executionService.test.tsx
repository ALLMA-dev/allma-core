import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from '../../../src/api/axiosInstance.js';
import {
  useGetFlowExecutions,
  useGetExecutionDetail,
  useGetBranchSteps,
} from '../../../src/api/executionService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGetFlowExecutions', () => {
  it('stays idle until a flowId is provided', () => {
    const { result } = renderHook(() => useGetFlowExecutions({ flowId: '' }), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('builds the execution-list query string from the optional filters', async () => {
    mockGet.mockResolvedValue(apiOk({ items: [], nextToken: null }));

    const { result } = renderHook(
      () => useGetFlowExecutions({ flowId: 'f1', flowVersion: 2, status: 'FAILED', limit: 10 }),
      { wrapper: createHookWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      `/${V}${R.FLOW_EXECUTIONS}?flowDefinitionId=f1&flowVersion=2&status=FAILED&limit=10`,
    );
  });
});

describe('useGetExecutionDetail', () => {
  it('requests the detail route and unwraps the payload', async () => {
    mockGet.mockResolvedValue(apiOk({ flowExecutionId: 'ex1' }));

    const { result } = renderHook(() => useGetExecutionDetail('ex1'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ flowExecutionId: 'ex1' });
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.FLOW_EXECUTION_DETAIL('ex1')}`);
  });

  it('propagates the server error message', async () => {
    mockGet.mockResolvedValue(apiFail('not found'));

    const { result } = renderHook(() => useGetExecutionDetail('missing'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('not found');
  });
});

describe('useGetBranchSteps', () => {
  it('is disabled until every required parameter is present', () => {
    const { result } = renderHook(
      () =>
        useGetBranchSteps(
          { flowExecutionId: 'ex1', parentStepInstanceId: '', parentStepStartTime: '' },
          true,
        ),
      { wrapper: createHookWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('applies default limit/offset in the query string when omitted', async () => {
    mockGet.mockResolvedValue(apiOk({ steps: [] }));

    const { result } = renderHook(
      () =>
        useGetBranchSteps(
          { flowExecutionId: 'ex1', parentStepInstanceId: 'fork1', parentStepStartTime: '2020-01-01' },
          true,
        ),
      { wrapper: createHookWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      `/${V}${R.FLOW_EXECUTION_BRANCH_STEPS('ex1')}?parentStepInstanceId=fork1&parentStepStartTime=2020-01-01&limit=30&offset=0`,
    );
  });
});
