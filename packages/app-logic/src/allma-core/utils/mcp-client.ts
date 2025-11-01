import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { McpConnection, McpAuthentication } from '../../../../core-types/src/mcp/connections.js';
import axios from 'axios';
import { PermanentStepError, TransientStepError } from '../../../../core-types/src/errors.js';

const secretsManager = new SecretsManagerClient({});

async function getCredentials(authentication: McpAuthentication): Promise<string | undefined> {
  if (authentication.type === 'NONE') {
    return undefined;
  }

  const command = new GetSecretValueCommand({ SecretId: authentication.secretArn });
  const response = await secretsManager.send(command);

  if (!response.SecretString) {
    throw new PermanentStepError(`Secret ${authentication.secretArn} does not contain a SecretString.`);
  }

  const secretString = response.SecretString;

  // Try to parse as JSON. If it fails with a SyntaxError, assume it's a plaintext secret.
  try {
    const secretJson = JSON.parse(secretString);

    if (typeof secretJson !== 'object' || secretJson === null) {
      throw new PermanentStepError(`Secret ${authentication.secretArn} parsed as JSON, but it is not an object.`);
    }

    const credential = secretJson[authentication.secretJsonKey];

    if (credential === undefined) {
      throw new PermanentStepError(`Secret ${authentication.secretArn} is a valid JSON object but does not contain the key '${authentication.secretJsonKey}'. Available keys: ${Object.keys(secretJson).join(', ')}`);
    }

    if (typeof credential !== 'string') {
        throw new PermanentStepError(`The value for key '${authentication.secretJsonKey}' in secret ${authentication.secretArn} is not a string.`);
    }

    return credential;

  } catch (e) {
    if (e instanceof SyntaxError) {
      // JSON.parse failed. This is an expected case for plaintext secrets.
      // We return the whole string and ignore `secretJsonKey`.
      return secretString;
    }
    // Re-throw other errors (e.g., our PermanentStepErrors from above)
    throw e;
  }
}

export async function discoverTools(connection: McpConnection): Promise<any> {
  const credential = await getCredentials(connection.authentication);
  const headers: Record<string, string> = {};

  if (credential) {
    if (connection.authentication.type === 'BEARER_TOKEN') {
      headers['Authorization'] = `Bearer ${credential}`;
    } else if (connection.authentication.type === 'API_KEY') {
      // This is a common pattern, but may need to be adjusted based on the MCP server's specific header requirements.
      headers['X-API-Key'] = credential;
    }
  }

  const payload = {
    jsonrpc: '2.0',
    method: 'tools/list',
    id: '1',
  };

  try {
    const response = await axios.post(connection.serverUrl, payload, { headers });

    // Per JSON-RPC 2.0 spec, check for an error object in the response body.
    if (response.data.error) {
      const { code, message, data } = response.data.error;
      throw new PermanentStepError(
        `MCP server returned a JSON-RPC error during tool discovery. Code: ${code}, Message: ${message}`,
        { errorData: data },
      );
    }

    // Ensure the response data is a valid object before proceeding.
    if (typeof response.data !== 'object' || response.data === null) {
      throw new PermanentStepError(
        `MCP server returned a non-object response for tool discovery. Response body must be a JSON object.`,
        { receivedType: typeof response.data, responsePreview: String(response.data).substring(0, 500) }
      );
    }
    
    // Ensure the result is an array as expected from the 'tools/list' method.
    if (!Array.isArray(response.data.result)) {
        throw new PermanentStepError(
            `MCP server returned an invalid response for tools/list. Expected 'result' to be an array.`,
            { receivedType: typeof response.data.result, resultPreview: JSON.stringify(response.data.result, null, 2).substring(0, 500) }
        );
    }

    return response.data.result;
  } catch (error) {
    // If we already threw a typed error, let it propagate.
    if (error instanceof PermanentStepError || error instanceof TransientStepError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The server responded with a non-2xx status code.
        const { status, data } = error.response;
        console.log(`[DEBUG] MCP server responded with error status ${status}. Raw response data:`, data);
        if (status >= 500) {
          // 5xx errors are server-side and may be temporary.
          throw new TransientStepError(`MCP server returned a server error (HTTP ${status}) during tool discovery.`);
        } else if (status >= 400) {
          // 4xx errors indicate a client-side problem (e.g., bad arguments) and are not recoverable.
          throw new PermanentStepError(
            `MCP server returned a client error (HTTP ${status}) during tool discovery. Check connection settings.`,
            { responseData: data },
          );
        }
      } else if (error.request) {
        // The request was made but no response was received (e.g., network error, DNS failure, timeout).
        throw new TransientStepError('MCP server did not respond during tool discovery. This may be a temporary network issue.');
      }
    }

    // For any other unexpected error, wrap it as a permanent failure to prevent incorrect retries.
    // This includes JSON parsing errors from Axios itself if the server sends a malformed JSON response.
    throw new PermanentStepError('An unexpected error occurred during tool discovery.', {
      originalError: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}

export async function callTool(connection: McpConnection, toolName: string, args: object): Promise<any> {
  const credential = await getCredentials(connection.authentication);
  const headers: Record<string, string> = {};

  if (credential) {
    if (connection.authentication.type === 'BEARER_TOKEN') {
      headers['Authorization'] = `Bearer ${credential}`;
    } else if (connection.authentication.type === 'API_KEY') {
      headers['X-API-Key'] = credential;
    }
  }

  const payload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
    id: '1',
  };

  try {
    const response = await axios.post(connection.serverUrl, payload, { headers });

    // Per JSON-RPC 2.0 spec, the presence of an 'error' object indicates a failure, even with a 200 OK response.
    if (response.data.error) {
      const { code, message, data } = response.data.error;
      throw new PermanentStepError(
        `MCP tool call failed with JSON-RPC error. Code: ${code}, Message: ${message}`,
        { errorData: data },
      );
    }

    return response.data.result;
  } catch (error) {
    // If we already threw a typed error, let it propagate.
    if (error instanceof PermanentStepError || error instanceof TransientStepError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The server responded with a non-2xx status code.
        const { status, data } = error.response;
        if (status >= 500) {
          // 5xx errors are server-side and may be temporary.
          throw new TransientStepError(`MCP server returned a server error (HTTP ${status}).`);
        } else if (status >= 400) {
          // 4xx errors indicate a client-side problem (e.g., bad arguments) and are not recoverable.
          throw new PermanentStepError(
            `MCP server returned a client error (HTTP ${status}). Please check the step configuration.`,
            { responseData: data },
          );
        }
      } else if (error.request) {
        // The request was made but no response was received (e.g., network error, DNS failure, timeout).
        throw new TransientStepError('MCP server did not respond. This may be a temporary network issue.');
      }
    }

    // For any other unexpected error, wrap it as a permanent failure to prevent incorrect retries.
    throw new PermanentStepError('An unexpected error occurred while calling the MCP tool.', {
      originalError: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}