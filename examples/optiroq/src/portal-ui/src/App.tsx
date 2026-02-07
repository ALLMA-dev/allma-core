import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
// MODIFIED: Import Amplify's I18n utility
import { I18n } from 'aws-amplify/utils';
import { I18nextProvider } from 'react-i18next';
import { ModalsProvider } from '@mantine/modals';

import { queryClient } from '@/lib/queryClient';
import { AppRoutes } from '@/routes/AppRoutes';
import { theme } from '@/theme';
import { getConfig } from './config';
import i18n from './i18n';
import { PageLoader } from './components/shared/PageLoader';
import { configureAmplifyTranslations } from './lib/amplify-translations';

// --- Defer configuration until the app mounts ---
const config = getConfig();

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: config.VITE_COGNITO_USER_POOL_CLIENT_ID
    },
  },
  API: {
    REST: {
      'OptiroqApi': {
        endpoint: config.VITE_API_BASE_URL,
        region: config.VITE_AWS_REGION,
      }
    }
  }
});

// Configure Amplify's internal i18n with our translations.
configureAmplifyTranslations();

/**
 * The root application component. It sets up all the global providers
 * and now synchronizes i18next with Amplify's I18n instance.
 */
function App() {
  // MODIFIED: This useEffect hook is the core of the solution.
  // It ensures Amplify's translation is always in sync with our app's i18next state.
  useEffect(() => {
    // 1. Set the initial language for Amplify when the app loads.
    // This catches the language detected by i18next-browser-languagedetector.
    I18n.setLanguage(i18n.language);

    // 2. Create an event listener to update Amplify's language whenever our app's language changes.
    const handleLanguageChanged = (lng: string) => {
      I18n.setLanguage(lng);
    };

    // 3. Subscribe to the 'languageChanged' event from i18next.
    i18n.on('languageChanged', handleLanguageChanged);

    // 4. Return a cleanup function to remove the event listener when the App unmounts.
    // This prevents memory leaks.
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <React.Suspense fallback={<PageLoader />}>
            <BrowserRouter>
              <Authenticator.Provider>
                <ModalsProvider>
                  <AppRoutes />
                </ModalsProvider>
              </Authenticator.Provider>
            </BrowserRouter>
          </React.Suspense>
        </I18nextProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </MantineProvider>
  );
}

export default App;