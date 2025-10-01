import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import axiosInstance from './axiosInstance';
import { ALLMA_ADMIN_API_ROUTES, ExportApiInput, ImportApiInput, ImportApiResponse, AllmaExportFormat, ALLMA_ADMIN_API_VERSION } from '@allma/core-types';
import { saveAs } from 'file-saver';

/**
 * Mutation to trigger an export of flows and step definitions.
 */
export function useExportMutation() {
  return useMutation({
    mutationFn: async (data: ExportApiInput) => {
      const response = await axiosInstance.post<AllmaExportFormat>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.EXPORT}`, data);
      return response.data;
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
    onError: (error) => {
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
    mutationFn: async (data: ImportApiInput) => {
      const response = await axiosInstance.post<ImportApiResponse>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.IMPORT}`, data);
      return response.data;
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
    onError: (error) => {
      notifications.show({
        title: 'Import Failed',
        message: error.message || 'An unknown error occurred.',
        color: 'red',
      });
    },
  });
}
