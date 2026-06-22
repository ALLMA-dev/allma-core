import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axiosInstance from './axiosInstance';
import {
    AdminApiResponse,
    StepStatsResponse,
    ALLMA_ADMIN_API_ROUTES,
    ALLMA_ADMIN_API_VERSION,
} from '@allma/core-types';

export const STEP_STATS_QUERY_KEY = 'stepStats';

export interface StepStatsParams {
    stepType?: string;
    flowDefinitionId?: string;
}

/**
 * Fetches aggregated per-step execution statistics, optionally filtered by step type and/or flow.
 */
export const useGetStepStats = (params: StepStatsParams = {}): UseQueryResult<StepStatsResponse, Error> => {
  return useQuery({
    queryKey: [STEP_STATS_QUERY_KEY, params],
    queryFn: async (): Promise<StepStatsResponse> => {
      const queryParams = new URLSearchParams();
      if (params.stepType) queryParams.append('stepType', params.stepType);
      if (params.flowDefinitionId) queryParams.append('flowDefinitionId', params.flowDefinitionId);
      const queryString = queryParams.toString();

      const response = await axiosInstance.get<AdminApiResponse<StepStatsResponse>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.STEP_STATS}${queryString ? `?${queryString}` : ''}`
      );
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch step statistics');
    },
    // Refresh step statistics every minute for a near-live view.
    refetchInterval: 60 * 1000,
  });
};
