import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { 
    type FlowDefinition, AdminApiResponse, ALLMA_ADMIN_API_ROUTES, ALLMA_ADMIN_API_VERSION,
    CreateFlowInput, CreateFlowVersionInput, AdminApiErrorResponse, CloneFlowInput, RedriveFlowApiOutput, UpdateFlowConfigInput, FlowMetadataStorageItem,
    ExecuteFlowApiInput, ExecuteFlowApiOutput
} from '@allma/core-types';
import axiosInstance from './axiosInstance.js';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconPlayerPlay } from '@tabler/icons-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { showErrorNotification } from '../utils/notifications.js';

// Params interface for clarity and type safety.
interface GetFlowsParams {
  searchText?: string;
  tag?: string;
}

// This type represents a summary of a specific version, returned by the versions list endpoint.
export interface FlowVersionSummary extends Pick<FlowDefinition, 'id' | 'version' | 'isPublished' | 'createdAt' | 'updatedAt' | 'publishedAt'> {}

const checkIcon = React.createElement(IconCheck, { size: "1.1rem" });
const xIcon = React.createElement(IconX, { size: "1.1rem" });
const playIcon = React.createElement(IconPlayerPlay, { size: "1.1rem" });

async function fetchFlows(params: GetFlowsParams): Promise<FlowMetadataStorageItem[]> {
  const queryParams = new URLSearchParams();
  if (params.searchText) queryParams.append('searchText', params.searchText);
  if (params.tag) queryParams.append('tag', params.tag);
  
  const response = await axiosInstance.get<AdminApiResponse<FlowMetadataStorageItem[]>>(
    `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOWS}?${queryParams.toString()}`
  );

  if (response.data.success) return response.data.data;
  throw new Error(response.data.error?.message || 'Failed to fetch flows');
}

export const useGetFlows = (params: GetFlowsParams) => {
  return useQuery({
    queryKey: ['flows', params],
    queryFn: () => fetchFlows(params),
  });
};

export const useGetAllFlowTags = () => {
  return useQuery({
    queryKey: ['flowTags'],
    queryFn: async (): Promise<string[]> => {
      const response = await axiosInstance.get<AdminApiResponse<string[]>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_TAGS}`
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to fetch flow tags');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useGetFlowConfig = (flowId?: string): UseQueryResult<FlowMetadataStorageItem, Error> => {
    return useQuery({
        queryKey: ['flowConfig', flowId],
        queryFn: async (): Promise<FlowMetadataStorageItem> => {
            if (!flowId) throw new Error("Flow ID is required.");
            const response = await axiosInstance.get<AdminApiResponse<FlowMetadataStorageItem>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_CONFIG_DETAIL(flowId)}`
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || `Failed to fetch flow config for ${flowId}`);
        },
        enabled: !!flowId,
    });
};

export const useListFlowVersions = (flowId?: string): UseQueryResult<FlowVersionSummary[], Error> => {
    return useQuery({
        queryKey: ['flowVersions', flowId],
        queryFn: async (): Promise<FlowVersionSummary[]> => {
            if (!flowId) throw new Error("Flow ID is required.");
            const response = await axiosInstance.get<AdminApiResponse<FlowVersionSummary[]>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_LIST_VERSIONS(flowId)}`
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || `Failed to fetch versions for flow ${flowId}`);
        },
        enabled: !!flowId,
    });
};

export const useGetFlowByVersion = (flowId?: string, version?: string) => {
  return useQuery({
    queryKey: ['flowDetail', flowId, version],
    queryFn: async (): Promise<FlowDefinition> => {
      if (!flowId || !version) throw new Error("Flow ID and version are required.");
      const response = await axiosInstance.get<AdminApiResponse<FlowDefinition>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_DETAIL(flowId, version)}`
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || `Failed to fetch flow ${flowId} v${version}`);
    },
    enabled: !!flowId && !!version,
  });
};

// --- MUTATIONS ---

export const useCreateFlow = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newFlowData: CreateFlowInput) => {
            const response = await axiosInstance.post<AdminApiResponse<FlowMetadataStorageItem>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOWS}`, newFlowData);
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to create flow');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['flows'] });
            notifications.show({ title: 'Flow Created', message: `Successfully created flow "${data.name}".`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Creation Failed', error);
        }
    });
};

export const useUpdateFlowConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ flowId, data }: { flowId: string, data: UpdateFlowConfigInput }) => {
            const response = await axiosInstance.put<AdminApiResponse<FlowMetadataStorageItem>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_CONFIG_DETAIL(flowId)}`,
                data
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to update flow settings');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['flows'] });
            queryClient.setQueryData(['flowConfig', data.id], data);
            notifications.show({ title: 'Settings Saved', message: `Successfully updated settings for "${data.name}".`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Save Failed', error);
        }
    });
};

export const useCloneFlow = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ flowId, data }: { flowId: string, data: CloneFlowInput }) => {
            const response = await axiosInstance.post<AdminApiResponse<FlowMetadataStorageItem>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_CLONE(flowId)}`,
                data
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to clone flow');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['flows'] });
            notifications.show({ title: 'Flow Cloned', message: `Successfully cloned to "${data.name}".`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Clone Failed', error);
        }
    });
};

export const useCreateFlowVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ flowId, data }: { flowId: string, data: CreateFlowVersionInput }) => {
            const response = await axiosInstance.post<AdminApiResponse<FlowDefinition>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_CREATE_VERSION(flowId)}`, data);
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to create new version');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['flowVersions', data.id] });
            notifications.show({ title: 'Version Created', message: `Successfully created version ${data.version}.`, color: 'green', icon: checkIcon });
        },
        onError: (error: unknown) => {
            showErrorNotification('Creation Failed', error);
        }
    });
};

export const useUpdateFlowVersion = () => {
    const queryClient = useQueryClient();
    return useMutation<FlowDefinition, Error, { flowDef: FlowDefinition }>({
        mutationFn: async ({ flowDef }) => {
            const flowDataToSave: FlowDefinition = { ...flowDef };

            const response = await axiosInstance.put<AdminApiResponse<FlowDefinition>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_DETAIL(flowDataToSave.id, flowDataToSave.version)}`,
                flowDataToSave
            );

            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'An unknown error occurred while saving.');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['flowVersions', data.id] });
            queryClient.setQueryData(['flowDetail', data.id, String(data.version)], data);
            notifications.show({ title: 'Draft Saved', message: `Successfully saved changes to version ${data.version}.`, color: 'blue', icon: checkIcon });
        },
        onError: (error: unknown) => {
            let title = 'Save Failed';
            let message = 'An unexpected error occurred.';

            if (axios.isAxiosError(error) && error.response?.data?.error) {
                const apiErrorPayload = (error.response.data as AdminApiErrorResponse).error;
                message = apiErrorPayload.message || message;
                
                if (apiErrorPayload.code === 'VALIDATION_ERROR' && apiErrorPayload.details) {
                    title = 'Validation Error';
                    const { fieldErrors, formErrors } = apiErrorPayload.details;
                    const errorMessages: string[] = [];

                    if (Array.isArray(formErrors) && formErrors.length > 0) {
                        errorMessages.push(...formErrors);
                    }

                    if (fieldErrors && typeof fieldErrors === 'object') {
                        const formattedFieldErrors = Object.entries(fieldErrors).map(([field, errors]) => {
                           if(Array.isArray(errors)) {
                               return `${field}: ${errors.join(', ')}`;
                           }
                           return `${field}: ${JSON.stringify(errors)}`;
                        }).join('; ');
                        errorMessages.push(formattedFieldErrors);
                    }
                    
                    if (errorMessages.length > 0) {
                        message = errorMessages.join('; ');
                    }
                }
            } else if (error instanceof Error) {
                message = error.message;
            }

            notifications.show({ 
                title, 
                message, 
                color: 'red', 
                icon: xIcon,
                autoClose: 10000
            });
        }
    });
};

export const usePublishFlowVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ flowId, version }: { flowId: string, version: number }) => {
      const response = await axiosInstance.post<AdminApiResponse<FlowDefinition>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_PUBLISH(flowId, version)}`);
      if (response.data.success) return response.data.data;
      throw new Error(response.data.error?.message || 'Failed to publish flow version');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['flowConfig', data.id] });
      queryClient.invalidateQueries({ queryKey: ['flowVersions', data.id] });
      queryClient.setQueryData(['flowDetail', data.id, String(data.version)], data);
      notifications.show({ title: 'Publish Successful', message: `Flow version ${data.version} has been published.`, color: 'green', icon: checkIcon });
    },
    onError: (error: unknown) => {
      showErrorNotification('Publish Failed', error);
    },
  });
};

export const useUnpublishFlowVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ flowId, version }: { flowId: string, version: number }) => {
        const response = await axiosInstance.post<AdminApiResponse<{ message: string }>>(`${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_UNPUBLISH(flowId, version)}`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.error?.message || 'Failed to unpublish flow version');
      },
      onSuccess: (_data, { flowId, version }) => {
        queryClient.invalidateQueries({ queryKey: ['flows'] });
        queryClient.invalidateQueries({ queryKey: ['flowConfig', flowId] });
        queryClient.invalidateQueries({ queryKey: ['flowVersions', flowId] });
        queryClient.invalidateQueries({ queryKey: ['flowDetail', flowId, String(version)] });
        notifications.show({ title: 'Unpublish Successful', message: `Version ${version} has been unpublished.`, color: 'orange', icon: checkIcon });
      },
      onError: (error: unknown) => {
        showErrorNotification('Unpublish Failed', error);
      },
    });
};

// hook to delegate UI side-effects to the calling component.
export const useFlowRedrive = () => {
    return useMutation({
        mutationFn: async ({ executionId }: { executionId: string }): Promise<RedriveFlowApiOutput> => {
            const response = await axiosInstance.post<AdminApiResponse<RedriveFlowApiOutput>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_REDRIVE(executionId)}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to redrive flow');
        },
        onSuccess: (data) => {
            notifications.show({
                title: 'Redrive Initiated',
                message: `New execution started: ${data.newFlowExecutionId.substring(0, 8)}...`,
                color: 'green',
                icon: playIcon,
            });
        },
        onError: (error: unknown) => {
            showErrorNotification('Redrive Failed', error);
        }
    });
};

export const useExecuteFlowVersion = () => {
    return useMutation({
        mutationFn: async ({ flowId, version, initialContextData }: { flowId: string, version: string | number, initialContextData: Record<string, any> }): Promise<ExecuteFlowApiOutput> => {
            const payload: ExecuteFlowApiInput = { initialContextData };
            const response = await axiosInstance.post<AdminApiResponse<ExecuteFlowApiOutput>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_EXECUTE(flowId, version)}`,
                payload
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to start test execution');
        },
        onSuccess: (data) => {
            notifications.show({
                title: 'Execution Started',
                message: `Successfully started new execution: ${data.newFlowExecutionId.substring(0, 8)}`,
                color: 'green',
                icon: checkIcon,
            });
        },
        onError: (error: unknown) => {
            showErrorNotification('Execution Failed', error);
        }
    });
};