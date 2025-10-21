interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string | number | boolean>;
  body: string;
}

/**
 * A dedicated Lambda handler for responding to API Gateway OPTIONS preflight requests.
 * It dynamically constructs the correct CORS headers based on the allowed origins
 * provided in an environment variable.
 */
export const handler = async (event: any): Promise<LambdaResponse> => {
  console.log('Received CORS preflight request:', JSON.stringify(event, null, 2));

  // The list of allowed origins is passed as a comma-separated string.
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());

  const requestOrigin = event.headers?.origin || event.headers?.Origin;

  // Default headers required for a valid CORS preflight response.
  const headers: Record<string, string | number | boolean> = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    'Access-Control-Max-Age': 86400, // 24 hours
  };

  // If the request's origin is in our allowed list, reflect it back.
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else {
    // For security, if the origin is not allowed, we don't return the ACAO header.
    // The browser will then correctly block the request. We can return the first
    // allowed origin as a default, or an empty string, but not sending it is clearest.
    console.warn(`Request origin "${requestOrigin}" is not in the allowed list: [${allowedOrigins.join(', ')}]`);
  }

  return {
    statusCode: 200,
    headers,
    body: '', // The body of an OPTIONS response is ignored.
  };
};