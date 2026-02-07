import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult, UseQueryOptions } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiGetView, apiPostCommand } from '@/lib/apiClient';
import i18n from '@/i18n';

/**
 * Custom React Query hook for fetching data from a standard '/views' endpoint.
 *
 * @template T The expected type of the data in the view-model.
 * @param {string} viewName The name of the view to fetch (e.g., 'project-dashboard').
 * @param {string | null} id The unique identifier for the entity, or null for list views.
 * @param {Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>} [options] Optional extra options for React Query.
 * @returns {UseQueryResult<T, Error>} The result object from React Query.
 */
export const useApiView = <T>(
  viewName: string,
  id: string | null,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<T, Error> => {
  return useQuery<T, Error>({
    queryKey: ['view', viewName, id],
    queryFn: () => apiGetView<T>(viewName, id),
    // Query will not run until viewName is provided. ID is optional.
    enabled: !!viewName,
    ...options,
  });
};

interface CommandVariables {
  command: string;
  payload?: object;
  idOverride?: string | null;
  suppressNotification?: boolean;
}

/**
 * Custom React Query hook for sending commands to a standard '/commands' endpoint.
 * It handles loading states, error notifications, and automatic cache invalidation
 * of related view data upon success.
 *
 * @template T The expected type of the response data from the command.
 * @param {string} entityType The type of the entity (e.g., 'project', 'quote').
 * @param {string | null} id The unique identifier for the entity. Can be null for creation commands.
 * @returns {UseMutationResult<T, Error, CommandVariables>} The mutation object from React Query.
 */
export const useApiCommand = <T>(
  entityType: string,
  id: string | null
): UseMutationResult<T, Error, CommandVariables> => {
  const queryClient = useQueryClient();

  return useMutation<T, Error, CommandVariables>({
    mutationFn: ({ command, payload, idOverride }) =>
      apiPostCommand<T>(entityType, idOverride !== undefined ? idOverride : id, command, payload),
    onSuccess: (data, variables) => {
      // Invalidate all queries starting with 'view' to trigger a refetch of any
      // data that might have been changed by this command.
      queryClient.invalidateQueries({ queryKey: ['view'] });

      // Conditionally show notifications. For non-disturbing actions like
      // updating a profile preference, or initiating a BOM upload where the UI
      // provides its own specific notification, we suppress the generic one.
      if (variables.command !== 'updateProfile' && variables.command !== 'initiate-bom-upload' && !variables.suppressNotification) {
        notifications.show({
          title: i18n.t('notifications:Action Successful'),
          message: i18n.t('notifications:Your changes have been saved.'),
          color: 'green',
        });
      }
    },
    onError: (error, variables) => {
        notifications.show({
          title: i18n.t('notifications:Action Failed'),
          message: error.message || i18n.t('notifications:An unknown error occurred.'),
          color: 'red',
        });
    },
  });
};