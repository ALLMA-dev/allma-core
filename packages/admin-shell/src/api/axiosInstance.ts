import axios, { type InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getAppConfig } from '../config/app-config.ts';
const { VITE_API_BASE_URL: apiBaseUrl } = getAppConfig();

if (!apiBaseUrl) {
  const errorMessage = 'Configuration Error: VITE_API_BASE_URL environment variable is not set. The application cannot connect to the backend API.';
  console.error(errorMessage);
  // This provides a clear, immediate error to the developer if the environment is misconfigured.
  throw new Error(errorMessage);
}
const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
});
// Request interceptor to add the Cognito ID token to an Authorization header
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const session = await fetchAuthSession(); // Fetches the current session including tokens
      const idToken = session.tokens?.idToken?.toString(); // Access the idToken and convert to string

      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      } else {
        console.warn('Axios Interceptor: No ID token found in session. Request will be unauthenticated.');
        // Potentially redirect to login or handle unauthenticated state
        // For example, if this happens consistently, it might indicate an issue with login state.
      }
    } catch (error) {
      console.error('Axios Interceptor: Error fetching auth session or token:', error);
      // Handle error, e.g., by redirecting to login or showing an error message
      // Depending on the error, you might want to prevent the request from being sent.
      // For now, we let it proceed, and the API will likely return a 401.
    }
    return config;
  },
  (error) => {
    console.error('Axios Interceptor: Request error:', error);
    return Promise.reject(error);
  }
);
// Optional: Response interceptor for handling global errors (like 401s consistently)
axiosInstance.interceptors.response.use(
  (response) => response, // Simply return the response if it's successful
  (error) => {
    if (error.response?.status === 401) {
      console.error('Axios Interceptor: Received 401 Unauthorized. Token might be expired or invalid.');
      // Here you could trigger a sign-out or a token refresh attempt
      // For example:
      // signOut(); // If using useAuthenticator hook context
      // window.location.href = '/login'; // Or redirect to login
    }
    return Promise.reject(error);
  }
);
export default axiosInstance;