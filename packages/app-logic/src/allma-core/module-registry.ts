import { SYSTEM_STEP_DEFINITIONS, StepHandler, SystemModuleIdentifiers } from '@allma/core-types';
import { handleS3DataLoader } from './data-loaders/s3-loader.js';
import { handleDynamoDBLoader } from './data-loaders/dynamodb-loader.js';
import { handleDdbQueryToS3Manifest } from './data-loaders/ddb-query-to-s3-manifest.js';
import { handleSqsGetQueueAttributes } from './data-loaders/sqs-get-queue-attributes.js';
import { handleSqsReceiveMessages } from './data-loaders/sqs-receive-messages.js';
import { executeS3Saver } from './data-savers/s3-saver.js';
import { executeDynamoDBUpdate } from './data-savers/dynamodb-update-item.js';
import { executeDynamoDBQueryAndUpdate } from './data-savers/dynamodb-query-and-update.js';
import { executeComposeObjectTransformer } from './data-transformers/compose-object-transformer.js';
import { executeGenerateArrayTransformer } from './data-transformers/generate-array-transformer.js';
import { executeFlattenArrayTransformer } from './data-transformers/flatten-array-transformer.js';
import { executeArrayAggregatorTransformer } from './data-transformers/array-aggregator-transformer.js';
import { executeDateTimeCalculator } from './data-transformers/date-time-calculator.js';

const internalSystemModuleIdentifiers = new Set(
  SYSTEM_STEP_DEFINITIONS.map(def => def.moduleIdentifier)
);

export function hasInternalModuleHandler(moduleIdentifier: string): boolean {
  return internalSystemModuleIdentifiers.has(moduleIdentifier);
}

const moduleHandlerRegistry: Record<string, StepHandler> = {
    [SystemModuleIdentifiers.S3_DATA_LOADER]: handleS3DataLoader,
    [SystemModuleIdentifiers.DYNAMODB_DATA_LOADER]: handleDynamoDBLoader,
    [SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST]: handleDdbQueryToS3Manifest,
    [SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES]: handleSqsGetQueueAttributes,
    [SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES]: handleSqsReceiveMessages,
    [SystemModuleIdentifiers.S3_DATA_SAVER]: executeS3Saver,
    [SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM]: executeDynamoDBUpdate,
    [SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE]: executeDynamoDBQueryAndUpdate,
    [SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT]: executeComposeObjectTransformer,
    [SystemModuleIdentifiers.GENERATE_ARRAY]: executeGenerateArrayTransformer,
    [SystemModuleIdentifiers.FLATTEN_ARRAY]: executeFlattenArrayTransformer,
    [SystemModuleIdentifiers.ARRAY_AGGREGATOR]: executeArrayAggregatorTransformer,
    [SystemModuleIdentifiers.DATE_TIME_CALCULATOR]: executeDateTimeCalculator,
};

export function getModuleHandler(moduleIdentifier: string): StepHandler {
    const handler = moduleHandlerRegistry[moduleIdentifier];
    if (!handler) {
        throw new Error(`No handler registered for module: ${moduleIdentifier}`);
    }
    return handler;
}
