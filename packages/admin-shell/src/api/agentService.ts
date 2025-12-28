import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import axiosInstance from './axiosInstance.js';
import {
    Agent,
    AdminApiResponse,
    ALLMA_ADMIN_API_ROUTES,
    ALLMA_ADMIN_API_VERSION,
    CreateAgentInput,
    UpdateAgentInput,
} from '@allma/core-types';
import { notifications } from '@mantine/notifications';
import { showErrorNotification } from '../utils/notifications.js';
import { AGENTS_QUERY_KEY, AGENT_DETAIL_QUERY_KEY } from '../features/agents/constants.js';

// --- QUERY HOOKS (Read operations) ---

export const useGetAgents = (): UseQueryResult<Agent[], Error> => {
    return useQuery({
        queryKey: [AGENTS_QUERY_KEY],
        queryFn: async (): Promise<Agent[]> => {
            const response = await axiosInstance.get<AdminApiResponse<Agent[]>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.AGENTS}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to fetch agents');
        },
    });
};

export const useGetAgent = (agentId?: string): UseQueryResult<Agent, Error> => {
    return useQuery({
        queryKey: [AGENT_DETAIL_QUERY_KEY, agentId],
        queryFn: async (): Promise<Agent> => {
            if (!agentId) throw new Error("Agent ID is required.");
            const response = await axiosInstance.get<AdminApiResponse<Agent>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.AGENT_DETAIL(agentId)}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || `Failed to fetch agent ${agentId}`);
        },
        enabled: !!agentId,
    });
};

// --- MUTATION HOOKS (Write operations) ---

export const useCreateAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newAgentData: CreateAgentInput) => {
            const response = await axiosInstance.post<AdminApiResponse<Agent>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.AGENTS}`, newAgentData);
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to create agent');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
            notifications.show({ title: 'Agent Created', message: 'Successfully created a new agent.', color: 'green' });
        },
        onError: (error: unknown) => {
            showErrorNotification('Creation Failed', error);
        }
    });
};

export const useUpdateAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ agentId, data }: { agentId: string; data: UpdateAgentInput }) => {
            const response = await axiosInstance.put<AdminApiResponse<Agent>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.AGENT_DETAIL(agentId)}`,
                data
            );
            if (response.data.success) return response.data.data;
            throw new Error(response.data.error?.message || 'Failed to update agent');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
            queryClient.setQueryData([AGENT_DETAIL_QUERY_KEY, data.id], data);
            notifications.show({ title: 'Agent Updated', message: `Successfully updated agent "${data.name}".`, color: 'blue' });
        },
        onError: (error: unknown) => {
            showErrorNotification('Update Failed', error);
        }
    });
};

export const useDeleteAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (agentId: string) => {
            const response = await axiosInstance.delete<AdminApiResponse<void>>(`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.AGENT_DETAIL(agentId)}`);
            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to delete agent');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
            notifications.show({ title: 'Agent Deleted', message: 'The agent has been successfully deleted.', color: 'orange' });
        },
        onError: (error: unknown) => {
            showErrorNotification('Deletion Failed', error);
        }
    });
};