import axios, { type InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { getConfig } from '../config';

/**
 * A pre-configured Axios instance for making requests to the Optiroq API.
 * The baseURL is set dynamically in the request interceptor to avoid
 * race conditions during application startup.
 */
export const apiClient = axios.create();

/**
 * Axios request interceptor.
 * This function is executed before every request. It dynamically sets the
 * baseURL from the application config and attaches the user's JWT ID token
 * to the Authorization header by fetching the current session from Amplify.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Get the latest config just-in-time.
    const { VITE_API_BASE_URL: apiBaseUrl } = getConfig();
    if (!apiBaseUrl) {
      // This will now correctly throw an error if the config is still missing when an API call is made.
      const error = new Error('API URL is not configured. Cannot make API requests.');
      console.error('API Client Interceptor:', error);
      return Promise.reject(error);
    }
    config.baseURL = apiBaseUrl;

    // 2. Attach the authentication token.
    // RATIONALE: By calling fetchAuthSession before every request, we ensure that
    // we always have a valid, non-expired JWT. Amplify's library handles the
    // caching and refreshing of tokens automatically in the background. This
    // eliminates the previous bug caused by using a potentially stale token
    // from a separate state store.
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      const token = session.tokens?.idToken?.toString();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('API Client Interceptor: User is not authenticated or session is invalid.', error);
      // Do not attach a token if session fetching fails.
      // The request will proceed without auth and be rejected by the API, which is the correct behavior.
    }
    
    return config;
  },
  (error) => {
    console.error('API Client: Request setup error:', error);
    return Promise.reject(error);
  }
);

/**
 * Axios response interceptor.
 * This handles global error responses. For example, if a 401 Unauthorized
 * response is received, it means the user's session is invalid, so we
 * trigger a global sign-out.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('API Client: Received 401 Unauthorized. Signing out.');
      // RATIONALE: Calling signOut() directly integrates with the Amplify Auth context
      // used by the UI components (like useAuthenticator), triggering the correct
      // UI state changes and redirects automatically without needing a separate state store.
      signOut();
    }
    return Promise.reject(error);
  }
);

// --- API Helper Functions for the Consolidated API Model ---

/**
 * Fetches data for a specific view from the backend.
 * Corresponds to `GET /views/{viewName}/{id}`.
 */
export const apiGetView = async <T>(viewName: string, id: string | null): Promise<T> => {
  const url = id ? `/views/${viewName}/${id}` : `/views/${viewName}`;
  const response = await apiClient.get(url);
  return response.data;
};


/**
 * Sends a command to the backend to perform a state-changing action.
 * Corresponds to `POST /commands/{entityType}/{id}`.
 */
export const apiPostCommand = async <T>(
  entityType: string,
  id: string | null,
  command: string,
  payload: object = {}
): Promise<T> => {
  const url = id ? `/commands/${entityType}/${id}` : `/commands/${entityType}`;
  const response = await apiClient.post(url, { command, payload });
  return response.data;
};

/**
 * Gets a pre-signed URL for uploading a file to S3.
 * Corresponds to `POST /files/upload-url`.
 */
export const apiGetUploadUrl = async (fileName: string, fileType: string, prefix?: string): Promise<{ uploadUrl: string; key: string; bucket: string; }> => {
    const response = await apiClient.post('/files/upload-url', { fileName, fileType, prefix });
    return response.data;
}