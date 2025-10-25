import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import axiosInstance from './axiosInstance';
import { ALLMA_ADMIN_API_ROUTES, ExportApiInput, ImportApiResponse, AllmaExportFormat, ALLMA_ADMIN_API_VERSION, AdminApiResponse } from '@allma/core-types';
import { saveAs } from 'file-saver';

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
    onError: (error: Error) => {
      notifications.show({
        title: 'Export Failed',
        message: error.message || 'An unknown error occurred.',
        color: 'red',
      });
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
      notifications.show({
        title: 'Import Successful',
        message: `Created: ${data.created.flows} flows, ${data.created.steps} steps. Updated: ${data.updated.flows} flows, ${data.updated.steps} steps.`,
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Import Failed',
        message: error.message || 'An unknown error occurred.',
        color: 'red',
        autoClose: 10000,
      });
    },
  });
}