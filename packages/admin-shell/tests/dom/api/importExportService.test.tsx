import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';

vi.mock('../../../src/api/axiosInstance.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
// A successful export triggers a browser download — stub the saver so nothing touches the DOM.
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import axiosInstance from '../../../src/api/axiosInstance.js';
import { notifications } from '@mantine/notifications';
import { saveAs } from 'file-saver';
import { useExportMutation, useImportMutation } from '../../../src/api/importExportService.js';
import { createHookWrapper, apiOk, apiFail } from '../../_helpers/query.js';

const mockPost = vi.mocked(axiosInstance.post);
const mockNotify = vi.mocked(notifications.show);
const mockSaveAs = vi.mocked(saveAs);

const V = ALLMA_ADMIN_API_VERSION;
const R = ALLMA_ADMIN_API_ROUTES;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useExportMutation', () => {
  it('posts to the export route, saves the file, and notifies on success', async () => {
    mockPost.mockResolvedValue(apiOk({ flows: [], version: '1' }));

    const { result } = renderHook(() => useExportMutation(), { wrapper: createHookWrapper() });
    result.current.mutate({ flowIds: ['f1'] } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.EXPORT}`, { flowIds: ['f1'] });
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Export Successful', color: 'green' }),
    );
  });

  it('notifies and does not save when export fails', async () => {
    mockPost.mockResolvedValue(apiFail('export error'));

    const { result } = renderHook(() => useExportMutation(), { wrapper: createHookWrapper() });
    result.current.mutate({ flowIds: [] } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSaveAs).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Export Failed', color: 'red' }),
    );
  });
});

describe('useImportMutation', () => {
  it('posts to the import route and notifies with the created/updated counts', async () => {
    mockPost.mockResolvedValue(
      apiOk({
        created: { flows: 1, steps: 2, prompts: 0, agents: 0 },
        updated: { flows: 0, steps: 0, prompts: 0, agents: 0 },
      }),
    );

    const { result } = renderHook(() => useImportMutation(), { wrapper: createHookWrapper() });
    result.current.mutate({ flows: [] } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(`/${V}${R.IMPORT}`, { flows: [] });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Import Successful', color: 'green' }),
    );
  });

  it('appends the server error details to the thrown message and notifies', async () => {
    mockPost.mockResolvedValue({
      data: { success: false, error: { message: 'invalid', details: { line: 4 } } },
    });

    const { result } = renderHook(() => useImportMutation(), { wrapper: createHookWrapper() });
    result.current.mutate({ flows: [] } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('invalid');
    expect(result.current.error?.message).toContain('"line":4');
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Import Failed', color: 'red' }),
    );
  });
});
