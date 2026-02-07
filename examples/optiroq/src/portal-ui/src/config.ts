// Enhance the global Window interface to include our runtime config
declare global {
  interface Window {
    runtimeConfig?: AppConfig;
  }
}

export interface AppConfig {
  VITE_AWS_REGION: string;
  VITE_COGNITO_USER_POOL_ID: string;
  VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  VITE_API_BASE_URL: string;
}

let appConfig: AppConfig;

/**
 * Retrieves the application configuration. In a deployed environment, it reads from
 * `window.runtimeConfig` injected by the CDK. For local development, it falls back
 * to Vite's environment variables (from .env files).
 *
 * @throws {Error} If the configuration is not available.
 * @returns {AppConfig} The application configuration object.
 */
export function getConfig(): AppConfig {
  if (appConfig) {
    return appConfig;
  }

  // Production/Staging: Read config injected by CDK into index.html
  // The Optiroq CDK injects a different structure which we must normalize here.
  const deployedConfig = (window as any).runtimeConfig;
  if (deployedConfig && deployedConfig.VITE_COGNITO_USER_POOL_ID) {
    appConfig = {
      VITE_AWS_REGION: deployedConfig.VITE_AWS_REGION,
      VITE_COGNITO_USER_POOL_ID: deployedConfig.VITE_COGNITO_USER_POOL_ID,
      VITE_COGNITO_USER_POOL_CLIENT_ID: deployedConfig.VITE_COGNITO_USER_POOL_CLIENT_ID,
      VITE_API_BASE_URL: deployedConfig.VITE_API_BASE_URL,
    };
    return appConfig;
  }

  // Development: Fallback to Vite's import.meta.env for local .env files
  if (import.meta.env.DEV) {
    // These keys must match the variables in your `.env.local` file
    appConfig = {
      VITE_AWS_REGION: import.meta.env.VITE_APP_AWS_REGION,
      VITE_COGNITO_USER_POOL_ID: import.meta.env.VITE_APP_COGNITO_USER_POOL_ID,
      VITE_COGNITO_USER_POOL_CLIENT_ID: import.meta.env.VITE_APP_COGNITO_USER_POOL_CLIENT_ID,
      VITE_API_BASE_URL: import.meta.env.VITE_APP_API_BASE_URL,
    };

    // Add a specific check for local development to provide a better error message.
    if (!appConfig.VITE_COGNITO_USER_POOL_ID || !appConfig.VITE_API_BASE_URL) {
      console.error("One or more required environment variables are not set in your .env.local file.");
      throw new Error("Development configuration error: Required variables are missing from .env.local. Please check the file and restart the development server.");
    }
    
    return appConfig;
  }

  // Error case: Config is missing in a deployed environment
  const errorMsg = 'Application Error: Runtime configuration is missing or was not replaced by the deployment process.';
  document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem; text-align: center; color: red;"><h1>${errorMsg}</h1></div>`;
  throw new Error(errorMsg);
}