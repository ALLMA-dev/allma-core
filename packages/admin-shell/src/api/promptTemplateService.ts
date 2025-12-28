import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import {
  type PromptTemplate,
  type CreatePromptTemplateInput,
  type UpdatePromptTemplateInput,  
  type AdminApiResponse,
  ALLMA_ADMIN_API_ROUTES,
  ALLMA_ADMIN_API_VERSION,
  CreatePromptVersionInput,
  ClonePromptInput,
  type PromptTemplateMetadataStorageItem,
} from '@allma/core-types';
import axiosInstance from './axiosInstance.js';
import { PROMPT_TEMPLATES_QUERY_KEY, PROMPT_TEMPLATE_DETAIL_QUERY_KEY } from '../features/prompts/constants.js';
import { showErrorNotification } from '../utils/notifications.js';

// --- TYPES ---

// This type represents a summary of a prompt version, returned by the list endpoint.
export interface PromptVersionSummary extends Pick<PromptTemplate, 'id' | 'name' | 'description' | 'version' | 'isPublished' | 'tags' | 'updatedAt'> {}

// --- ICONS ---

const checkIcon = React.createElement(IconCheck, { size: "1.1rem" });

// --- QUERY HOOKS (Read operations) ---

/**
 * Fetches a list of all master prompt templates (metadata records).
 * This now aligns with the backend's `handleListPrompts` returning PromptTemplateMetadataStorageItem[].
 */
export const useGetPrompts = (): UseQueryResult<PromptTemplateMetadataStorageItem[], Error> => {
  return useQuery({
    queryKey: [PROMPT_TEMPLATES_QUERY_KEY],
    queryFn: async (): Promise<PromptTemplateMetadataStorageItem[]> => {
      const response = await axiosInstance.get<AdminApiResponse<PromptTemplateMetadataStorageItem[]>>( 
        `${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}`
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to fetch prompts');
    },
  });
};

/**
 * Fetches a list of all versions for a specific prompt template.
 */
export const useListPromptVersions = (promptId?: string): UseQueryResult<PromptVersionSummary[], Error> => {
  return useQuery({
    queryKey: [PROMPT_TEMPLATES_QUERY_KEY, promptId, 'versions'],
    queryFn: async (): Promise<PromptVersionSummary[]> => {
      if (!promptId) throw new Error("Prompt ID is required.");
      const response = await axiosInstance.get<AdminApiResponse<PromptVersionSummary[]>>(
        `${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSIONS(promptId)}`
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || `Failed to fetch versions for prompt ${promptId}`);
    },
    enabled: !!promptId,
  });
};


/**
 * Fetches the details of a single, specific prompt version.
 */
export const useGetPromptByVersion = (promptId?: string, version?: string): UseQueryResult<PromptTemplate, Error> => {
  return useQuery({
    queryKey: [PROMPT_TEMPLATE_DETAIL_QUERY_KEY, promptId, version],
    queryFn: async (): Promise<PromptTemplate> => {
      if (!promptId || !version) throw new Error("Prompt ID and version are required.");
      const response = await axiosInstance.get<AdminApiResponse<PromptTemplate>>(
        `${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSION_DETAIL(promptId, version)}`
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || `Failed to fetch prompt ${promptId} v${version}`);
    },
    enabled: !!promptId && !!version,
  });
};


// --- MUTATION HOOKS (Write operations) ---

/**
 * Creates a new prompt family with its initial version 1.
 */
export const useCreatePrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPromptData: CreatePromptTemplateInput) => {
      const response = await axiosInstance.post<AdminApiResponse<PromptTemplate>>(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}`, newPromptData);
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to create prompt');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY] });
      notifications.show({ title: 'Prompt Created', message: `Successfully created prompt "${data.name}".`, color: 'green', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Creation Failed', error);
    }
  });
};

/**
 * Clones an existing prompt family.
 */
export const useClonePrompt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ promptId, data }: { promptId: string, data: ClonePromptInput }) => {
            const response = await axiosInstance.post<AdminApiResponse<PromptTemplate>>(
                `${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_CLONE(promptId)}`,
                data
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to clone prompt');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY] });
            notifications.show({ title: 'Prompt Cloned', message: `Successfully cloned to "${data.name}".`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Clone Failed', error);
        }
    });
};

/**
 * Creates a new version for an existing prompt family.
 */
export const useCreatePromptVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ promptId, data }: { promptId: string, data: CreatePromptVersionInput }) => {
            const response = await axiosInstance.post<AdminApiResponse<PromptTemplate>>(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSIONS(promptId)}`, data);
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to create new version');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY, data.id, 'versions'] });
            notifications.show({ title: 'Version Created', message: `Successfully created version ${data.version} for prompt "${data.name}".`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Creation Failed', error);
        }
    });
};

/**
 * Updates a specific draft version of a prompt.
 */
export const useUpdatePromptVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (promptToUpdate: { id: string; version: number } & UpdatePromptTemplateInput) => {
      const { id, version, ...updateData } = promptToUpdate;
      const response = await axiosInstance.put<AdminApiResponse<PromptTemplate>>(
        `${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSION_DETAIL(id, version)}`, updateData);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error.message || 'Failed to update prompt');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY, data.id, 'versions'] });
      queryClient.setQueryData([PROMPT_TEMPLATE_DETAIL_QUERY_KEY, data.id, String(data.version)], data);
      notifications.show({ title: 'Draft Saved', message: `Successfully saved changes to version ${data.version}.`, color: 'blue', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Update Failed', error);
    },
  });
};

/**
 * Publishes a specific version of a prompt.
 */
export const usePublishPromptVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, version }: { promptId: string, version: number }) => {
      const response = await axiosInstance.post<AdminApiResponse<PromptTemplate>>(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSION_PUBLISH(promptId, version)}`);
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to publish prompt version');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY] }); // Invalidate master list to update published version info
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY, data.id, 'versions'] });
      queryClient.setQueryData([PROMPT_TEMPLATE_DETAIL_QUERY_KEY, data.id, String(data.version)], data);
      notifications.show({ title: 'Publish Successful', message: `Prompt "${data.name}" version ${data.version} has been published.`, color: 'green', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Publish Failed', error);
    },
  });
};

/**
 * Unpublishes a specific version of a prompt.
 */
export const useUnpublishPromptVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ promptId, version }: { promptId: string, version: number }) => {
        const response = await axiosInstance.post<AdminApiResponse<{ message: string }>>(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSION_UNPUBLISH(promptId, version)}`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.error?.message || 'Failed to unpublish prompt version');
      },
      onSuccess: (_data, { promptId, version }) => {
        queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY] }); // Invalidate master list to update published version info
        queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY, promptId, 'versions'] });
        queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATE_DETAIL_QUERY_KEY, promptId, String(version)] });
        notifications.show({ title: 'Unpublish Successful', message: `Version ${version} has been unpublished.`, color: 'orange', icon: checkIcon });
      },
      onError: (error: unknown) => {
        showErrorNotification('Unpublish Failed', error);
      },
    });
};

/**
 * Deletes a specific draft version of a prompt.
 */
export const useDeletePromptVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, version }: { promptId: string, version: number }) => {
      await axiosInstance.delete(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATE_VERSION_DETAIL(promptId, version)}`);
    },
    onSuccess: (_data, { promptId, version }) => {
      queryClient.invalidateQueries({ queryKey: [PROMPT_TEMPLATES_QUERY_KEY, promptId, 'versions'] });
      queryClient.removeQueries({ queryKey: [PROMPT_TEMPLATE_DETAIL_QUERY_KEY, promptId, String(version)] });
      notifications.show({ title: 'Version Deleted', message: `Version ${version} has been deleted.`, color: 'orange', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Deletion Failed', error);
    },
  });
};