import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * A QueryClient with retries disabled so failing queries/mutations settle on the first
 * attempt — tests assert the error path without waiting out backoff.
 */
export const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

/**
 * Wrapper for `renderHook` covering the API-layer hooks: a fresh QueryClient plus a
 * MemoryRouter (some mutation hooks call `useNavigate`).
 */
export const createHookWrapper = (): ((props: { children: ReactNode }) => JSX.Element) => {
  const client = makeTestQueryClient();
  const HookWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  HookWrapper.displayName = 'HookWrapper';
  return HookWrapper;
};

/** Build a successful `AdminApiResponse` envelope (`{ success: true, data }`). */
export const apiOk = <T,>(data: T): { data: { success: true; data: T } } => ({
  data: { success: true, data },
});

/** Build a failed `AdminApiResponse` envelope (`{ success: false, error }`). */
export const apiFail = (
  message: string,
): { data: { success: false; error: { message: string } } } => ({
  data: { success: false, error: { message } },
});
