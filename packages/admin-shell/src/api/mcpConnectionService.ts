import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from './axiosInstance.js';
import {
  McpConnection,
  McpConnectionMetadataStorageItem as McpConnectionSummary,
  AdminApiResponse,
  ALLMA_ADMIN_API_ROUTES,
  ALLMA_ADMIN_API_VERSION,
  CreateMcpConnectionInput,
  UpdateMcpConnectionInput,
  DiscoverToolResponse,
} from '@allma/core-types';
type McpToolDefinition = DiscoverToolResponse[number];
import { notifications } from '@mantine/notifications';
import { showErrorNotification } from '../utils/notifications.js';

export const MCP_CONNECTIONS_QUERY_KEY = 'mcp-connections';
export const MCP_CONNECTION_DETAIL_QUERY_KEY = 'mcp-connection-detail';

// GET /v1/allma/mcp-connections
export const useGetMcpConnections = () => {
    return useQuery<McpConnectionSummary[]>({
        queryKey: [MCP_CONNECTIONS_QUERY_KEY],
        queryFn: async () => {
            const response = await axiosInstance.get<AdminApiResponse<McpConnectionSummary[]>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTIONS}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to fetch MCP connections');
        }
    });
};

// GET /v1/allma/mcp-connections/{id}
export const useGetMcpConnection = (id: string | undefined) => {
    return useQuery<McpConnection>({
        queryKey: [MCP_CONNECTION_DETAIL_QUERY_KEY, id],
        queryFn: async () => {
            if (!id) throw new Error("Connection ID is required.");
            const response = await axiosInstance.get<AdminApiResponse<McpConnection>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTION_DETAIL(id)}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to fetch MCP connection');
        },
        enabled: !!id
    });
};

// POST /v1/allma/mcp-connections
export const useCreateMcpConnection = () => {
    const queryClient = useQueryClient();
    return useMutation<McpConnection, Error, CreateMcpConnectionInput>({
        mutationFn: async (data) => {
            const response = await axiosInstance.post<AdminApiResponse<McpConnection>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTIONS}`,
                data
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to create MCP connection');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MCP_CONNECTIONS_QUERY_KEY] });
            notifications.show({
                title: 'Success',
                message: 'MCP Connection created successfully.',
                color: 'green',
            });
        },
        onError: (error: unknown) => {
            showErrorNotification('Creation Failed', error);
        }
    });
};

// PUT /v1/allma/mcp-connections/{id}
export const useUpdateMcpConnection = () => {
    const queryClient = useQueryClient();
    return useMutation<McpConnection, Error, { id: string; data: UpdateMcpConnectionInput }>({
        mutationFn: async ({ id, data }) => {
            const response = await axiosInstance.put<AdminApiResponse<McpConnection>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTION_DETAIL(id)}`,
                data
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to update MCP connection');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [MCP_CONNECTIONS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [MCP_CONNECTION_DETAIL_QUERY_KEY, data.id] });
            notifications.show({
                title: 'Success',
                message: 'MCP Connection updated successfully.',
                color: 'green',
            });
        },
        onError: (error: unknown) => {
            showErrorNotification('Update Failed', error);
        }
    });
};

// DELETE /v1/allma/mcp-connections/{id}
export const useDeleteMcpConnection = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            const response = await axiosInstance.delete<AdminApiResponse<void>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTION_DETAIL(id)}`
            );
            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to delete MCP connection');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MCP_CONNECTIONS_QUERY_KEY] });
            notifications.show({
                title: 'Success',
                message: 'MCP Connection deleted successfully.',
                color: 'green',
            });
        },
        onError: (error: unknown) => {
            showErrorNotification('Deletion Failed', error);
        }
    });
};

// POST /v1/allma/mcp-connections/{id}/discover
export const useDiscoverTools = () => {
    return useMutation<McpToolDefinition[], Error, string>({
        mutationFn: async (id): Promise<McpToolDefinition[]> => {
            const response = await axiosInstance.post<AdminApiResponse<McpToolDefinition[]>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTION_DISCOVER(id)}`
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Could not fetch tools from the MCP server.');
        },
        onError: (error: unknown) => {
            showErrorNotification('Discovery Failed', error);
        }
    });
};