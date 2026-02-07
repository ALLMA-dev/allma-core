import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { UserProfileViewModel, BuyerProfile } from '@optiroq/types';
import { generatePresignedGetUrl } from '../lib/s3-utils.js';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Checks if a profile is complete based on business rules (name and function must be set).
 */
const isProfileComplete = (profile: Partial<BuyerProfile>): boolean => {
  return !!(profile.name && profile.function);
};

/**
 * Fetches the profile for a given user. Creates a default, incomplete profile if one doesn't exist.
 * Calculates the `isProfileComplete` flag for the frontend.
 */
export async function getProfile(userId: string, email: string): Promise<UserProfileViewModel> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching profile for user: ${userId}`, { userId });

  try {
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    });

    const { Item } = await docClient.send(getCommand);
    const profile = Item as BuyerProfile | undefined;

    if (profile) {
      return {
        userId,
        email: profile.email,
        name: profile.name,
        phoneNumber: profile.phoneNumber,
        function: profile.function,
        pictureUrl: await generatePresignedGetUrl(profile.pictureUrl || ''),
        language: profile.language || 'en',
        isProfileComplete: isProfileComplete(profile),
      };
    }

    // If no profile exists, create a default one
    log_info(`No profile found for user ${userId}, creating default.`, { userId });
    const defaultProfile: BuyerProfile = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      entityType: 'BUYER',
      email,
      language: 'en', // Default language
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: defaultProfile,
    }));

    return {
      userId,
      email,
      language: 'en',
      isProfileComplete: false, // A new default profile is never complete
    };
  } catch (error) {
    log_error('Failed to get or create user profile', { userId, error });
    throw new Error('An error occurred while fetching user profile.');
  }
}