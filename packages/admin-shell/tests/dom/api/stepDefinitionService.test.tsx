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
  useGetStepDefinitions,
  useGetStepDefinition,
  useGetAvailableSteps,
  fetchStepDefinitionById,
  useCreateStepDefinition,
  useUpdateStepDefinition,
  useDeleteStepDefinition,
} from '../../../src/api/stepDefinitionService.js';
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

describe('useGetStepDefinitions', () => {
  it('requests the user-scoped step definitions route and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 's1' }]));

    const { result } = renderHook(() => useGetStepDefinitions(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 's1' }]);
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITIONS}?source=user`);
  });

  it('surfaces the server error message on failure', async () => {
    mockGet.mockResolvedValue(apiFail('boom'));

    const { result } = renderHook(() => useGetStepDefinitions(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useGetAvailableSteps', () => {
  it('requests the unscoped step definitions route', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 's1', source: 'system' }]));

    const { result } = renderHook(() => useGetAvailableSteps(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITIONS}`);
  });
});

describe('useGetStepDefinition', () => {
  it('stays idle while the id is undefined (disabled query)', () => {
    const { result } = renderHook(() => useGetStepDefinition(undefined), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the detail route once an id is supplied', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 's1' }));

    const { result } = renderHook(() => useGetStepDefinition('s1'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITION_DETAIL('s1')}`);
  });
});

describe('fetchStepDefinitionById', () => {
  it('resolves the detail payload from the envelope', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 's1', name: 'Step One' }));

    await expect(fetchStepDefinitionById('s1')).resolves.toEqual({ id: 's1', name: 'Step One' });
    expect(mockGet).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITION_DETAIL('s1')}`);
  });

  it('throws the server error message when the envelope reports failure', async () => {
    mockGet.mockResolvedValue(apiFail('missing'));

    await expect(fetchStepDefinitionById('s1')).rejects.toThrow('missing');
  });
});

describe('useCreateStepDefinition', () => {
  it('posts the new definition and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 's1', name: 'New' }));

    const { result } = renderHook(() => useCreateStepDefinition(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ name: 'New' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITIONS}`, { name: 'New' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Step Definition Created', color: 'green' }),
    );
  });

  it('shows an error notification when creation fails', async () => {
    mockPost.mockResolvedValue(apiFail('dupe'));

    const { result } = renderHook(() => useCreateStepDefinition(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ name: 'dupe' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation Failed', color: 'red' }),
    );
  });
});

describe('useUpdateStepDefinition', () => {
  it('puts to the detail route and notifies on success', async () => {
    mockPut.mockResolvedValue(apiOk({ id: 's1', name: 'Renamed' }));

    const { result } = renderHook(() => useUpdateStepDefinition(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ id: 's1', data: { name: 'Renamed' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITION_DETAIL('s1')}`, {
      name: 'Renamed',
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Save Successful', color: 'blue' }),
    );
  });
});

describe('useDeleteStepDefinition', () => {
  it('deletes the detail route and notifies on success', async () => {
    mockDelete.mockResolvedValue(apiOk(undefined));

    const { result } = renderHook(() => useDeleteStepDefinition(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith(`/${V}${R.STEP_DEFINITION_DETAIL('s1')}`);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deleted', color: 'orange' }),
    );
  });
});
