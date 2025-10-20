
import { defaultConfig } from '../../../core-cdk/dist/lib/config/default-config.js';
import { ENV_VAR_NAMES } from '@allma/core-types';

export default async () => {
  console.log('\nSetting up integration test environment...');

  // Set environment variables from the CDK dev config so the application logic can access them
  process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME] = defaultConfig.allmaConfigTableName;
  process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME] = defaultConfig.allmaExecutionTracesBucketName;
  process.env[ENV_VAR_NAMES.AI_API_KEY_SECRET_ARN] = defaultConfig.aiApiKeySecretArn;
  
  // Add any other required environment variables here
  
  console.log(`Using DynamoDB Config Table: ${process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]}`);
  console.log('Setup complete.\n');
};
