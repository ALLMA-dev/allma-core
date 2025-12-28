import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import {
  type StepDefinition,
  type AdminApiResponse,
  ALLMA_ADMIN_API_ROUTES,
  ALLMA_ADMIN_API_VERSION,
  CreateStepDefinitionInput,
  UpdateStepDefinitionInput,
} from '@allma/core-types';
import axiosInstance from './axiosInstance.js';
import { showErrorNotification } from '../utils/notifications.js';

export const STEP_DEFINITIONS_QUERY_KEY = 'stepDefinitions';
export const STEP_DEFINITION_DETAIL_QUERY_KEY = 'stepDefinitionDetail';

const checkIcon = React.createElement(IconCheck, { size: "1.1rem" });

// --- QUERY HOOKS ---

export const useGetStepDefinitions = (): UseQueryResult<StepDefinition[], Error> => {
  return useQuery({
    queryKey: [STEP_DEFINITIONS_QUERY_KEY],
    queryFn: async (): Promise<StepDefinition[]> => {
      const response = await axiosInstance.get<AdminApiResponse<StepDefinition[]>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITIONS}?source=user`
      );
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch step definitions');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useGetStepDefinition = (id?: string): UseQueryResult<StepDefinition, Error> => {
  return useQuery({
    queryKey: [STEP_DEFINITION_DETAIL_QUERY_KEY, id],
    queryFn: async (): Promise<StepDefinition> => {
      if (!id) throw new Error("Step Definition ID is required.");
      return fetchStepDefinitionById(id);
    },
    enabled: !!id,
  });
};

// The unified type from the backend, extended for UI purposes
export type UnifiedStepDefinition = StepDefinition & { 
  source: 'user' | 'external' | 'system';
  defaultConfig?: any;
};

const fetchAvailableSteps = async (): Promise<UnifiedStepDefinition[]> => {
  const response = await axiosInstance.get<AdminApiResponse<UnifiedStepDefinition[]>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITIONS}`);
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch available steps');
};

export const useGetAvailableSteps = () => {
  return useQuery<UnifiedStepDefinition[], Error>({
      queryKey: ['availableSteps'],
      queryFn: fetchAvailableSteps,
  });
};

// --- IMPERATIVE FETCH FUNCTION ---

/**
 * Fetches a single, full step definition by its ID.
 * This is an imperative fetch function, not a hook, designed for on-demand use.
 * @param id The ID of the step definition to fetch.
 * @returns A promise that resolves to the full StepDefinition.
 */
export const fetchStepDefinitionById = async (id: string): Promise<StepDefinition> => {
  const response = await axiosInstance.get<AdminApiResponse<StepDefinition>>(
    `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITION_DETAIL(id)}`
  );
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || `Failed to fetch step definition ${id}`);
};


// --- MUTATION HOOKS ---

export const useCreateStepDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newData: CreateStepDefinitionInput) => {
      const response = await axiosInstance.post<AdminApiResponse<StepDefinition>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITIONS}`, newData);
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to create step definition');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [STEP_DEFINITIONS_QUERY_KEY] });
      notifications.show({ title: 'Step Definition Created', message: `Successfully created "${data.name}".`, color: 'green', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Creation Failed', error);
    }
  });
};

export const useUpdateStepDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: UpdateStepDefinitionInput }) => {
      const response = await axiosInstance.put<AdminApiResponse<StepDefinition>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITION_DETAIL(id)}`, data);
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to update step definition');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [STEP_DEFINITIONS_QUERY_KEY] });
      queryClient.setQueryData([STEP_DEFINITION_DETAIL_QUERY_KEY, data.id], data);
      notifications.show({ title: 'Save Successful', message: `Successfully saved changes to "${data.name}".`, color: 'blue', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Update Failed', error);
    },
  });
};

export const useDeleteStepDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITION_DETAIL(id)}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [STEP_DEFINITIONS_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: [STEP_DEFINITION_DETAIL_QUERY_KEY, id] });
      notifications.show({ title: 'Deleted', message: 'Step definition has been deleted.', color: 'orange', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Deletion Failed', error);
    },
  });
};