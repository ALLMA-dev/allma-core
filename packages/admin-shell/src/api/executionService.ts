import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axiosInstance from './axiosInstance';
import {
    AdminApiResponse, PaginatedResponse, FlowExecutionSummary, FlowExecutionDetails,
    ALLMA_ADMIN_API_ROUTES,
    ALLMA_ADMIN_API_VERSION,
    BranchStepsResponse,
    AllmaStepExecutionRecord,
    ExecutionProgressResponse
} from '@allma/core-types';
import {
    EXECUTION_DETAIL_QUERY_KEY, EXECUTIONS_LIST_QUERY_KEY, BRANCH_STEPS_QUERY_KEY,
    EXECUTION_PROGRESS_QUERY_KEY, EXECUTION_PROGRESS_POLL_INTERVAL_MS
} from '../features/executions/constants';

const TERMINAL_EXECUTION_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

// ---- Fetch a list of flow executions ----

interface GetFlowExecutionsParams {
  flowId: string;
  flowVersion?: number | null;
  status?: string; 
  limit?: number;
  nextToken?: string;
}

export const useGetFlowExecutions = (params: GetFlowExecutionsParams): UseQueryResult<PaginatedResponse<FlowExecutionSummary>, Error> => {
  return useQuery({
    queryKey: [EXECUTIONS_LIST_QUERY_KEY, params],
    queryFn: async () => {
      const { flowId, flowVersion, status, limit, nextToken } = params;
      const queryParams = new URLSearchParams({
        flowDefinitionId: flowId,
      });
      if (flowVersion) {
        queryParams.append('flowVersion', String(flowVersion));
      }
      if (status) { 
        queryParams.append('status', status);
      }
      if (limit) queryParams.append('limit', String(limit));
      if (nextToken) queryParams.append('nextToken', nextToken);

      const response = await axiosInstance.get<AdminApiResponse<PaginatedResponse<FlowExecutionSummary>>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS}?${queryParams.toString()}`
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch executions');
    },
    enabled: !!params.flowId, // Only run if flowId is selected
  });
};

// ---- Fetch details for a single execution ----

export const useGetExecutionDetail = (executionId: string | undefined): UseQueryResult<FlowExecutionDetails, Error> => {
  return useQuery({
    queryKey: [EXECUTION_DETAIL_QUERY_KEY, executionId],
    queryFn: async () => {
      if (!executionId) throw new Error("Execution ID is undefined.");
      
      const response = await axiosInstance.get<AdminApiResponse<FlowExecutionDetails>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_DETAIL(executionId)}`
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch execution details');
    },
    enabled: !!executionId, // Only run if executionId is provided
  });
};

// ---- Fetch live progress for a single execution ----
// Polls while the execution is still running and automatically stops once it reaches a
// terminal status, so completed executions incur no further requests.

export const useGetExecutionProgress = (
  executionId: string | undefined,
  mode: 'single' | 'tree' = 'tree',
): UseQueryResult<ExecutionProgressResponse, Error> => {
  return useQuery({
    queryKey: [EXECUTION_PROGRESS_QUERY_KEY, executionId, mode],
    queryFn: async () => {
      if (!executionId) throw new Error('Execution ID is undefined.');

      const response = await axiosInstance.get<AdminApiResponse<ExecutionProgressResponse>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_PROGRESS(executionId)}`,
        { params: { mode } }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch execution progress');
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = query.state.data?.root?.status;
      return status && TERMINAL_EXECUTION_STATUSES.includes(status) ? false : EXECUTION_PROGRESS_POLL_INTERVAL_MS;
    },
  });
};

// ---- Fetch details for a specific step ----

interface GetStepRecordDetailsParams {
    flowExecutionId: string;
    stepInstanceId: string;
    attemptNumber?: number;
    branchExecutionId?: string;
    eventTimestamp?: string;
}

export const useGetStepRecordDetails = (params: GetStepRecordDetailsParams, isEnabled: boolean): UseQueryResult<AllmaStepExecutionRecord, Error> => {
    return useQuery({
        queryKey: ['stepRecordDetails', params],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                stepInstanceId: params.stepInstanceId,
            });
            if (params.attemptNumber) queryParams.append('attemptNumber', String(params.attemptNumber));
            if (params.branchExecutionId) queryParams.append('branchExecutionId', params.branchExecutionId);
            if (params.eventTimestamp) queryParams.append('eventTimestamp', params.eventTimestamp);

            const response = await axiosInstance.get<AdminApiResponse<AllmaStepExecutionRecord>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_STEP_RECORD(params.flowExecutionId)}?${queryParams.toString()}`
            );

            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to fetch step record details');
        },
        enabled: isEnabled,
        staleTime: Infinity, 
    });
};

// ---- Fetch steps for a specific parallel branch execution ----

interface GetBranchStepsParams {
    flowExecutionId: string;
    parentStepInstanceId: string;
    parentStepStartTime: string;
    limit?: number;
    offset?: number;
}

export const useGetBranchSteps = (params: GetBranchStepsParams, isEnabled: boolean): UseQueryResult<BranchStepsResponse, Error> => {
    return useQuery({
        queryKey: [BRANCH_STEPS_QUERY_KEY, params],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                parentStepInstanceId: params.parentStepInstanceId,
                parentStepStartTime: params.parentStepStartTime,
                limit: String(params.limit || 30),
                offset: String(params.offset || 0),
            });
            
            const response = await axiosInstance.get<AdminApiResponse<BranchStepsResponse>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTION_BRANCH_STEPS(params.flowExecutionId)}?${queryParams.toString()}`
            );

            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to fetch branch steps');
        },
        enabled: isEnabled && !!params.flowExecutionId && !!params.parentStepInstanceId && !!params.parentStepStartTime,
        staleTime: Infinity, // These steps are historical, they won't change.
        gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    });
};