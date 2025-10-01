// --- API Response Wrappers ---

/**
 * Standardized success response for the Admin API.
 */
export interface AdminApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standardized error response for the Admin API.
 */
export interface AdminApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * A union type representing any possible response from the Admin API.
 */
export type AdminApiResponse<T> = AdminApiSuccessResponse<T> | AdminApiErrorResponse;


// --- Barrel Exports ---

export * from './api-schemas.js';
export * from './auth.js';
export * from './dashboard.js';
export * from './endpoints.js';
export * from './executionMonitoring.js';
export * from './importExport.js';
export * from './permissions.js';
export * from './utils.js';
