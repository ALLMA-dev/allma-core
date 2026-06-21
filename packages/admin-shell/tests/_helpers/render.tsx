import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { makeTestQueryClient } from './query.js';

/**
 * Renders a component inside the providers the admin shell relies on: Mantine (theme +
 * portals), React Query, and a router. Use for component tests; service/hook tests should
 * use the lighter `createHookWrapper`.
 */
export const renderWithProviders = (ui: ReactElement, options?: RenderOptions): RenderResult => {
  const client = makeTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <MantineProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
  Wrapper.displayName = 'TestProviders';
  return render(ui, { wrapper: Wrapper, ...options });
};
