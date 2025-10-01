import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import {
    StepHandler,
    TransientStepError,
    StepDefinition,
    FlowRuntimeState,
} from '@allma/core-types';
import { log_info, log_error, log_debug } from '@allma/core-sdk';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

// This Zod schema validates the structure of the `stepInput` object
// that is expected for this specific module.
const DdbQueryToS3ManifestConfigSchema = z.object({
    query: z.object({
        tableName: z.string().min(1, "tableName is required."),
        indexName: z.string().min(1, "indexName is required.").optional(),
        keyConditionExpression: z.string().min(1, "keyConditionExpression is required."),
        expressionAttributeValues: z.record(z.union([z.string(), z.number(), z.boolean()])),
        projectionExpression: z.string().min(1).optional(),
    }),
    destination: z.object({
        bucketName: z.string().min(1, "destination bucketName is required."),
        key: z.string().min(1, "destination key is required."),
    }),
});

export const handleDdbQueryToS3Manifest: StepHandler = async (stepDef: StepDefinition, stepInput: Record<string, any>, runtimeState: FlowRuntimeState) => {
    const correlationId = runtimeState.flowExecutionId;

    log_debug('Received stepInput for DDB to S3 manifest', stepInput, correlationId);

    // The stepInput is now the combined, rendered input for this module.
    const configParseResult = DdbQueryToS3ManifestConfigSchema.safeParse(stepInput);
    if (!configParseResult.success) {
        log_error("Invalid stepInput for system/ddb-query-to-s3-manifest module.", {
            errors: configParseResult.error.flatten()
        }, correlationId);
        throw new Error(`Invalid configuration for DDB to S3 Manifest step: ${configParseResult.error.message}`);
    }
    const config = configParseResult.data;

    // All configuration values are now expected to be fully rendered.
    const renderedExpressionAttributeValues = config.query.expressionAttributeValues;
    const renderedKey = config.destination.key;
    const renderedTableName = config.query.tableName;

    log_info('Starting DDB query to S3 manifest collection', {
        tableName: renderedTableName,
        s3Key: renderedKey,
    }, correlationId);

    let manifestContent = '';
    let lastEvaluatedKey: Record<string, any> | undefined;
    let itemsCollected = 0;
    const MAX_ITEMS_LIMIT = 500000; // Safety brake

    try {
        do {
            const queryParams: QueryCommandInput = {
                TableName: renderedTableName,
                IndexName: config.query.indexName,
                KeyConditionExpression: config.query.keyConditionExpression,
                ExpressionAttributeValues: renderedExpressionAttributeValues,
                ProjectionExpression: config.query.projectionExpression,
                ExclusiveStartKey: lastEvaluatedKey,
            };

            const result: QueryCommandOutput = await ddbDocClient.send(new QueryCommand(queryParams));

            if (result.Items) {
                for (const item of result.Items) {
                    manifestContent += JSON.stringify(item) + '\n';
                    itemsCollected++;
                }
            }
            lastEvaluatedKey = result.LastEvaluatedKey;

            if (itemsCollected > MAX_ITEMS_LIMIT) {
                throw new Error(`Safety limit of ${MAX_ITEMS_LIMIT} items reached. Aborting query.`);
            }

        } while (lastEvaluatedKey);

        await s3Client.send(new PutObjectCommand({
            Bucket: config.destination.bucketName,
            Key: renderedKey,
            Body: manifestContent,
            ContentType: 'application/x-jsonlines',
        }));

        log_info(`Successfully created S3 manifest with ${itemsCollected} items.`, {
            bucket: config.destination.bucketName,
            key: renderedKey,
        }, correlationId);

        return {
            outputData: {
                manifest: {
                    bucket: config.destination.bucketName,
                    key: renderedKey,
                },
                itemCount: itemsCollected,
            },
        };
    } catch (error: any) {
        log_error('Failed during DDB query to S3 manifest creation', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack?.substring(0, 10000), // Log a snippet of the stack
        }, correlationId);
        throw new TransientStepError(error.message);
    }
};
