import type { AdminApiErrorResponse, AdminApiSuccessResponse } from '@allma/core-types';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { log_debug } from './logger.js';

/**
 * Builds a standardized success response object.
 * @param data The data payload for the successful response.
 * @returns AdminApiSuccessResponse<T>
 */
export function buildSuccessResponse<T>(data: T): AdminApiSuccessResponse<T> {
    return { success: true, data };
}

/**
 * Builds a standardized error response object.
 * @param message The error message.
 * @param code An optional error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR').
 * @param details Optional additional error details.
 * @returns AdminApiErrorResponse
 */
export function buildErrorResponse(
    message: string,
    code: string,
    details?: any
): AdminApiErrorResponse {
    return { success: false, error: { message, code, details } };
}

/**
 * Creates a complete APIGatewayProxyResultV2 object for Lambda responses.
 * It determines the HTTP status code based on the success flag and error code.
 * @param defaultStatusCode The HTTP status code to use if success is true, or if no specific error code maps to a status.
 * @param bodyObject The AdminApiSuccessResponse or AdminApiErrorResponse to be stringified in the body.
 * @param correlationId Optional correlation ID for logging.
 * @returns APIGatewayProxyResultV2
 */
export function createApiGatewayResponse(
    defaultStatusCode: number,
    bodyObject: AdminApiSuccessResponse<any> | AdminApiErrorResponse,
    correlationId?: string
): APIGatewayProxyResultV2 {
    let effectiveStatusCode = defaultStatusCode;

    if (!bodyObject.success) {
        const errorCode = bodyObject.error.code;
        if (errorCode === 'NOT_FOUND') {
            effectiveStatusCode = 404;
        } else if (errorCode === 'VALIDATION_ERROR' || errorCode === 'INVALID_INPUT') {
            effectiveStatusCode = 400;
        } else if (errorCode === 'UNAUTHORIZED') {
            effectiveStatusCode = 401;
        } else if (errorCode === 'FORBIDDEN') {
            effectiveStatusCode = 403;
        } else if (errorCode === 'CONFLICT') {
            effectiveStatusCode = 409;
        } else {
            effectiveStatusCode = defaultStatusCode >= 400 ? defaultStatusCode : 500; // Default to 500 for errors if not specified
        }
    } else if (defaultStatusCode === 204 && bodyObject.data === null) { // Handle 204 No Content specifically
      // For 204, body should be empty.
      log_debug(`Responding with statusCode: ${effectiveStatusCode} (No Content)`, {}, correlationId);
      return {
        statusCode: effectiveStatusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE,PATCH',
        },
        body: '', // Empty body for 204
      };
    }


    log_debug(`Responding with statusCode: ${effectiveStatusCode}`, { bodyPreview: JSON.stringify(bodyObject).substring(0, 2000) }, correlationId);
    return {
        statusCode: effectiveStatusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE,PATCH',
        },
        body: JSON.stringify(bodyObject),
    };
}