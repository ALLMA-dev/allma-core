// Enhance the global Window interface to include our runtime config
declare global {
  interface Window {
    runtimeConfig?: AppConfig;
  }
}

export interface AppConfig {
  VITE_ADMIN_STAGE_NAME: string;
  VITE_AWS_REGION: string;
  VITE_COGNITO_USER_POOL_ID: string;
  VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  VITE_API_BASE_URL: string;
}

let appConfig: AppConfig;

/**
 * Retrieves the application configuration injected by the CDK.
 * Throws an error if the configuration is not available.
 */
export function getAppConfig(): AppConfig {
  if (appConfig) {
    return appConfig;
  }

  if (window.runtimeConfig) {
    appConfig = window.runtimeConfig;
    return appConfig;
  }

  // Fallback for local development using Vite's import.meta.env
  // @ts-expect-error - Vite specific
  if (import.meta.env.DEV) {
    appConfig = {
      // @ts-expect-error - Vite specific
      VITE_ADMIN_STAGE_NAME: import.meta.env.VITE_APP_ADMIN_STAGE_NAME || 'dev',
      // @ts-expect-error - Vite specific
      VITE_AWS_REGION: import.meta.env.VITE_APP_AWS_REGION,
      // @ts-expect-error - Vite specific
      VITE_COGNITO_USER_POOL_ID: import.meta.env.VITE_APP_COGNITO_USERPOOL_ID,
      // @ts-expect-error - Vite specific
      VITE_COGNITO_USER_POOL_CLIENT_ID: import.meta.env.VITE_APP_COGNITO_CLIENT_ID,
      // @ts-expect-error - Vite specific
      VITE_API_BASE_URL: import.meta.env.VITE_APP_ADMIN_API_URL,
    };
    return appConfig;
  }

  // Display a user-friendly error message if the config is missing
  document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 2rem; text-align: center; background: #fff0f0; border: 1px solid red; margin: 2rem;">
      <h1>Application Configuration Error</h1>
      <p>The runtime configuration was not found.</p>
      <p>This application must be deployed via the Allma CDK stack, which injects the necessary configuration at deployment time.</p>
    </div>
  `;
  throw new Error('Runtime configuration is not available on window.runtimeConfig.');
}
