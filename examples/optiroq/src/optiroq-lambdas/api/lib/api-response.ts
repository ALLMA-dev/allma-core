import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * A centralized list of allowed origins for CORS, populated from an environment variable.
 * The environment variable (e.g., ALLOWED_ORIGINS) should be a comma-separated string.
 * Example: 'http://localhost:3000,https://portal-beta.optiroq.com'
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

/**
 * Generates the necessary CORS headers for an API Gateway HTTP API response.
 * It validates the request's 'origin' header against a list of allowed origins.
 *
 * @param event The incoming API Gateway event, used to access the request headers.
 * @returns A record of headers to be included in the response.
 */
function getCorsHeaders(event: APIGatewayProxyEventV2): Record<string, string | boolean> {
  const origin = event.headers?.origin ?? '';
  
  // If no origins are configured, we default to a secure-by-default (no-CORS) state.
  if (ALLOWED_ORIGINS.length === 0) {
    console.warn('CORS Error: No ALLOWED_ORIGINS configured in environment variables.');
    return {};
  }
  
  const isOriginAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    // If the origin is allowed, reflect it back. Otherwise, the browser will block the response.
    'Access-Control-Allow-Origin': isOriginAllowed ? origin : '',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

/**
 * Creates a standardized successful API Gateway response object with CORS headers.
 *
 * @param event The original API Gateway event.
 * @param data The payload to be returned in the response body.
 * @param statusCode The HTTP status code (defaults to 200).
 * @returns A formatted APIGatewayProxyResultV2 object.
 */
export function createSuccessResponse(
  event: APIGatewayProxyEventV2,
  data: unknown,
  statusCode = 200,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(event),
    },
    body: JSON.stringify(data),
  };
}

/**
 * Creates a standardized error API Gateway response object with CORS headers.
 *
 * @param event The original API Gateway event.
 * @param error The error object or message.
 * @param statusCode The HTTP status code (defaults to 500).
 * @returns A formatted APIGatewayProxyResultV2 object.
 */
export function createErrorResponse(
  event: APIGatewayProxyEventV2,
  error: unknown,
  statusCode = 500,
): APIGatewayProxyResultV2 {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  console.error('Error response created:', { message, statusCode, error });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(event),
    },
    body: JSON.stringify({ message }),
  };
}