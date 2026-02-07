import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchInterval: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on 401/403/404 errors
        if (error && typeof error === 'object' && 'response' in error) {
            const status = (error as any).response?.status;
            if (status === 401 || status === 403 || status === 404) {
                return false;
            }
        }
        // Otherwise, retry up to 2 times
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevents excessive refetching
    },
  },
});