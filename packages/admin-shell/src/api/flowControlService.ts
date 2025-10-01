import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from './axiosInstance';
import { 
    AdminApiResponse, 
    ALLMA_ADMIN_API_ROUTES, 
    ALLMA_ADMIN_API_VERSION, 
    StatefulRedriveInput, 
    SandboxStepInput, 
    StepExecutionResult 
} from '@allma/core-types';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconPlayerPlay } from '@tabler/icons-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EXECUTIONS_LIST_QUERY_KEY } from '../features/executions/constants';

const checkIcon = React.createElement(IconCheck, { size: "1.1rem" });
const xIcon = React.createElement(IconX, { size: "1.1rem" });
const playIcon = React.createElement(IconPlayerPlay, { size: "1.1rem" });

/**
 * Mutation hook for performing a stateful redrive of a flow execution from a specific step.
 */
export const useStatefulRedrive = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: async ({ executionId, data }: { executionId: string, data: StatefulRedriveInput }) => {
            const response = await axiosInstance.post<AdminApiResponse<{ newFlowExecutionId: string }>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_STATEFUL_REDRIVE(executionId)}`,
                data
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to initiate stateful redrive');
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
            notifications.show({
                title: 'Redrive Initiated',
                message: `Successfully started new execution: ${data.newFlowExecutionId}`,
                color: 'green',
                icon: playIcon
            });
            // Navigate to the new execution's detail page
            navigate(`/executions/${data.newFlowExecutionId}`);
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Redrive Failed',
                message: error.message,
                color: 'red',
                icon: xIcon
            });
        }
    });
};

/**
 * Mutation hook for executing a single step in a sandboxed environment.
 */
export const useSandboxStep = () => {
    return useMutation({
        mutationFn: async (data: SandboxStepInput) => {
            const response = await axiosInstance.post<AdminApiResponse<StepExecutionResult>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_SANDBOX_STEP}`,
                data
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Sandbox execution failed');
        },
        onSuccess: () => {
            notifications.show({
                title: 'Sandbox Run Successful',
                message: 'The step executed successfully. See the results below.',
                color: 'green',
                icon: checkIcon
            });
        },
        onError: (error: Error) => {
             notifications.show({
                title: 'Sandbox Run Failed',
                message: error.message,
                color: 'red',
                icon: xIcon
            });
        }
    });
};