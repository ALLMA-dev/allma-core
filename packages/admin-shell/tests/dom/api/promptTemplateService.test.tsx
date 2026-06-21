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
  useGetPrompts,
  useListPromptVersions,
  useGetPromptByVersion,
  useCreatePrompt,
  useClonePrompt,
  useCreatePromptVersion,
  useUpdatePromptVersion,
  usePublishPromptVersion,
  useUnpublishPromptVersion,
  useDeletePromptVersion,
} from '../../../src/api/promptTemplateService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockPut = vi.mocked(axiosInstance.put);
const mockDelete = vi.mocked(axiosInstance.delete);
const mockNotify = vi.mocked(notifications.show);

// These services build routes WITHOUT a leading slash (`${V}${R...}`), unlike the others.
const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGetPrompts', () => {
  it('requests the prompt-templates route and unwraps the envelope', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 'p1' }]));

    const { result } = renderHook(() => useGetPrompts(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'p1' }]);
    expect(mockGet).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATES}`);
  });

  it('surfaces the server error message on failure', async () => {
    mockGet.mockResolvedValue(apiFail('boom'));

    const { result } = renderHook(() => useGetPrompts(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useListPromptVersions', () => {
  it('stays idle while the promptId is undefined (disabled query)', () => {
    const { result } = renderHook(() => useListPromptVersions(undefined), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the versions route once a promptId is supplied', async () => {
    mockGet.mockResolvedValue(apiOk([{ id: 'p1', version: 1 }]));

    const { result } = renderHook(() => useListPromptVersions('p1'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATE_VERSIONS('p1')}`);
  });
});

describe('useGetPromptByVersion', () => {
  it('stays idle until both promptId and version are present (disabled query)', () => {
    const { result } = renderHook(() => useGetPromptByVersion('p1', undefined), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the version-detail route once both are supplied', async () => {
    mockGet.mockResolvedValue(apiOk({ id: 'p1', version: 2 }));

    const { result } = renderHook(() => useGetPromptByVersion('p1', '2'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATE_VERSION_DETAIL('p1', '2')}`);
  });
});

describe('useCreatePrompt', () => {
  it('posts the new prompt and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'p1', name: 'New' }));

    const { result } = renderHook(() => useCreatePrompt(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'New' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATES}`, { name: 'New' });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prompt Created', color: 'green' }),
    );
  });

  it('notifies on a creation failure', async () => {
    mockPost.mockResolvedValue(apiFail('dupe'));

    const { result } = renderHook(() => useCreatePrompt(), { wrapper: createHookWrapper() });
    result.current.mutate({ name: 'dupe' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation Failed', color: 'red' }),
    );
  });
});

describe('useClonePrompt', () => {
  it('posts to the clone route and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'p2', name: 'Clone' }));

    const { result } = renderHook(() => useClonePrompt(), { wrapper: createHookWrapper() });
    result.current.mutate({ promptId: 'p1', data: { name: 'Clone' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATE_CLONE('p1')}`, {
      name: 'Clone',
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prompt Cloned', color: 'green' }),
    );
  });
});

describe('useCreatePromptVersion', () => {
  it('posts to the versions route and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'p1', name: 'P', version: 2 }));

    const { result } = renderHook(() => useCreatePromptVersion(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ promptId: 'p1', data: { body: 'x' } } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`${V}${R.PROMPT_TEMPLATE_VERSIONS('p1')}`, {
      body: 'x',
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Version Created', color: 'green' }),
    );
  });
});

describe('useUpdatePromptVersion', () => {
  it('strips id/version from the body and puts to the version-detail route', async () => {
    mockPut.mockResolvedValue(apiOk({ id: 'p1', name: 'P', version: 2 }));

    const { result } = renderHook(() => useUpdatePromptVersion(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ id: 'p1', version: 2, body: 'updated' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith(
      `${V}${R.PROMPT_TEMPLATE_VERSION_DETAIL('p1', 2)}`,
      { body: 'updated' },
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Draft Saved', color: 'blue' }),
    );
  });
});

describe('usePublishPromptVersion', () => {
  it('posts to the publish route and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ id: 'p1', name: 'P', version: 2 }));

    const { result } = renderHook(() => usePublishPromptVersion(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ promptId: 'p1', version: 2 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      `${V}${R.PROMPT_TEMPLATE_VERSION_PUBLISH('p1', 2)}`,
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Publish Successful', color: 'green' }),
    );
  });
});

describe('useUnpublishPromptVersion', () => {
  it('posts to the unpublish route and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ message: 'ok' }));

    const { result } = renderHook(() => useUnpublishPromptVersion(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ promptId: 'p1', version: 2 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      `${V}${R.PROMPT_TEMPLATE_VERSION_UNPUBLISH('p1', 2)}`,
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unpublish Successful', color: 'orange' }),
    );
  });
});

describe('useDeletePromptVersion', () => {
  it('deletes the version-detail route and notifies on success', async () => {
    mockDelete.mockResolvedValue({ data: { success: true, data: undefined } });

    const { result } = renderHook(() => useDeletePromptVersion(), {
      wrapper: createHookWrapper(),
    });
    result.current.mutate({ promptId: 'p1', version: 2 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith(
      `${V}${R.PROMPT_TEMPLATE_VERSION_DETAIL('p1', 2)}`,
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Version Deleted', color: 'orange' }),
    );
  });
});
