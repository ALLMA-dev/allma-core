import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axiosInstance from './axiosInstance';
import {
    AdminApiResponse,
    DashboardStats,
    ALLMA_ADMIN_API_ROUTES,
    ALLMA_ADMIN_API_VERSION,
} from '@allma/core-types';

export const DASHBOARD_STATS_QUERY_KEY = 'dashboardStats';

/**
 * Fetches the statistics for the main dashboard.
 */
export const useGetDashboardStats = (): UseQueryResult<DashboardStats, Error> => {
  return useQuery({
    queryKey: [DASHBOARD_STATS_QUERY_KEY],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await axiosInstance.get<AdminApiResponse<DashboardStats>>(
        `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.DASHBOARD_STATS}`
      );
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch dashboard stats');
    },
    // Refresh dashboard data every minute
    refetchInterval: 60 * 1000, 
  });
};