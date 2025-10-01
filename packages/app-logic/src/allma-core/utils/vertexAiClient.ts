import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { log_info } from '@allma/core-sdk'

const secretsClient = new SecretsManagerClient({});
let cachedVertexAIEmbeddings: VertexAIEmbeddings | null = null;

/**
 * Initializes and caches the VertexAIEmbeddings client.
 * This function centralizes the logic for authenticating and configuring the client.
 */
export async function getVertexAIEmbeddingsClient(secretArn: string, GOOGLE_LOCATION: string, model: string, correlationId?: string): Promise<VertexAIEmbeddings> {
    if (cachedVertexAIEmbeddings) {
        return cachedVertexAIEmbeddings;
    }

    if (!secretArn || !GOOGLE_LOCATION) {
        throw new Error('Missing required Google Cloud environment variables (SECRET_ARN, PROJECT_ID, LOCATION).');
    }

    log_info('Initializing new VertexAIEmbeddings client...', { location: GOOGLE_LOCATION }, correlationId);

    // Fetch the full credentials object from Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsClient.send(command);
    if (!response.SecretString) {
        throw new Error('SecretString is empty for Google Vertex AI credentials.');
    }
    
    // The secret is expected to contain a "VertexAiLangchain" key with the full service account object.
    const secretValue = JSON.parse(response.SecretString);
    const vertexCredentials = JSON.parse(secretValue.VertexAiLangchainJson);

    if (!vertexCredentials) {
        throw new Error('Secret must contain a "VertexAiLangchainJson" key with the service account object.');
    }

    // Instantiate the client with all required parameters
    const embeddings = new VertexAIEmbeddings({
        model: model,
        location: GOOGLE_LOCATION
    });

    cachedVertexAIEmbeddings = embeddings;
    return embeddings;
}
