import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ModalsProvider } from '@mantine/modals';
import { Amplify } from 'aws-amplify';

import '@aws-amplify/ui-react/styles.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';

import { Authenticator } from '@aws-amplify/ui-react';
import { AuthenticatedApp } from './AuthenticatedApp';
import { theme } from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getAppConfig } from './config/app-config';
import type { AllmaPlugin } from './types/plugin';

interface CreateAllmaAdminAppProps {
  plugins: AllmaPlugin[];
}

/**
 * The main entry point for creating and mounting the Allma Admin Shell.
 * This function composes the entire React application based on the provided plugins.
 */
export function createAllmaAdminApp({ plugins }: CreateAllmaAdminAppProps) {
  // 1. Configure authentication from the runtime config
  const config = getAppConfig();
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: config.VITE_COGNITO_USER_POOL_CLIENT_ID,
      },
    },
  });

  // 2. Set up React Query client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        // This prevents disruptive UI "reloads" when switching browser tabs.
        // Queries that need to be live can opt-in to this or use `refetchInterval`.
        refetchOnWindowFocus: false,
      },
    },
  });

  // Compose all AppWrapper components from the plugins
  const ComposedAppWrapper = ({ children }: { children: React.ReactNode }) =>
    plugins.reduceRight((acc, plugin) => {
      if (!plugin.AppWrapper) {
        return acc;
      }
      return React.createElement(plugin.AppWrapper, null, acc);
    }, children);


  // 4. Render the final application
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Could not find the root element to mount the application.');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <ErrorBoundary>
              <BrowserRouter>
                <Authenticator.Provider>
                  <ComposedAppWrapper>
                    <AuthenticatedApp plugins={plugins} />
                  </ComposedAppWrapper>
                </Authenticator.Provider>
              </BrowserRouter>
            </ErrorBoundary>
          </ModalsProvider>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </MantineProvider>
    </React.StrictMode>
  );
}