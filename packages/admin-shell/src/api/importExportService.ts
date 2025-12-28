import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import axiosInstance from './axiosInstance.js';
import { ALLMA_ADMIN_API_ROUTES, ExportApiInput, ImportApiResponse, AllmaExportFormat, ALLMA_ADMIN_API_VERSION, AdminApiResponse } from '@allma/core-types';
import { saveAs } from 'file-saver';
import { PROMPT_TEMPLATES_QUERY_KEY } from '../features/prompts/constants.js';
import { showErrorNotification } from '../utils/notifications.js';
import { AGENTS_QUERY_KEY } from '../features/agents/constants.js';

/**
 * Mutation to trigger an export of flows and step definitions.
 */
export function useExportMutation() {
  return useMutation({
    mutationFn: async (data: ExportApiInput): Promise<AllmaExportFormat> => {
      const response = await axiosInstance.post<AdminApiResponse<AllmaExportFormat>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.EXPORT}`, data);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'An unknown error occurred during export.');
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveAs(blob, `allma-export-${new Date().toISOString()}.json`);
      notifications.show({
        title: 'Export Successful',
        message: 'Your configuration has been exported.',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      showErrorNotification('Export Failed', error, 'An unknown error occurred.');
    },
  });
}

/**
 * Mutation to import a configuration file.
 */
export function useImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>): Promise<ImportApiResponse> => {
      const response = await axiosInstance.post<AdminApiResponse<ImportApiResponse>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.IMPORT}`, data);
      if (response.data.success) {
        return response.data.data;
      }
      const errDetails = response.data.error?.details ? ` Details: ${JSON.stringify(response.data.error.details)}` : '';
      throw new Error((response.data.error?.message || 'An unknown error occurred during import.') + errDetails);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['step-definitions'] });
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
      notifications.show({
        title: 'Import Successful',
        message: `Created: ${data.created.flows} flows, ${data.created.steps} steps, ${data.created.prompts} prompts, ${data.created.agents} agents. Updated: ${data.updated.flows} flows, ${data.updated.steps} steps, ${data.updated.prompts} prompts, ${data.updated.agents} agents.`,
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      showErrorNotification('Import Failed', error, 'An unknown error occurred.');
    },
  });
}