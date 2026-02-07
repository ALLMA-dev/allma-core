import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { UserProfileViewModel, BuyerProfile } from '@optiroq/types';
import { generatePresignedGetUrl } from '../lib/s3-utils.js';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

type BuyerFunction = BuyerProfile['function'];

const buyerFunctions: (BuyerFunction)[] = [
    'Commodity Buyer', 'Project Buyer', 'Sourcing Buyer', 'Advanced Sourcing Buyer'
];

interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  function?: BuyerFunction;
  pictureUrl?: string; // Expects an S3 key
  language?: 'en' | 'fr';
}

/**
 * Updates a user's profile with the provided fields.
 */
export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<UserProfileViewModel> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Updating profile for user: ${userId}`, { userId, payload });

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Dynamically build the UpdateExpression
  const fields: (keyof UpdateProfilePayload)[] = ['name', 'phoneNumber', 'function', 'pictureUrl', 'language'];
  for (const field of fields) {
      if (payload[field] !== undefined) {
          // Validation
          if (field === 'function' && payload.function && !buyerFunctions.includes(payload.function)) {
              throw new Error('Invalid function specified.');
          }
          if (field === 'language' && payload.language && !['en', 'fr'].includes(payload.language)) {
              throw new Error('Invalid language code provided.');
          }
          if (field === 'name' && payload.name && (payload.name.length < 2 || payload.name.length > 100)) {
              throw new Error('Name must be between 2 and 100 characters.');
          }
          
          const attrName = `#${field}`;
          const attrValue = `:${field}`;
          updateExpressions.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = field;
          expressionAttributeValues[attrValue] = payload[field] === '' ? null : payload[field]; // Allow clearing optional fields
      }
  }
  
  if (updateExpressions.length === 0) {
      throw new Error("No update fields provided.");
  }
  
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  try {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const { Attributes } = await docClient.send(command);

    if (!Attributes) {
        throw new Error('Failed to update profile, no attributes returned.');
    }
    
    const isComplete = !!(Attributes.name && Attributes.function);

    return {
      userId,
      email: Attributes.email,
      name: Attributes.name,
      phoneNumber: Attributes.phoneNumber,
      function: Attributes.function,
      pictureUrl: Attributes.pictureUrl ? await generatePresignedGetUrl(Attributes.pictureUrl) : undefined,
      language: Attributes.language || 'en',
      isProfileComplete: isComplete,
    };
  } catch (error) {
    log_error('Failed to update user profile in DynamoDB', { userId, error });
    throw new Error('An error occurred while updating the profile.');
  }
}