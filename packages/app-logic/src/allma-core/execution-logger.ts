import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
    ExecutionLoggerPayloadSchema,
    AllmaStepExecutionRecordSchema,
    AllmaFlowExecutionRecordSchema,
    type ExecutionLoggerPayload,
    ENV_VAR_NAMES,
    ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
    ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
    METADATA_SK_VALUE,
} from '@allma/core-types';
import { log_info, log_error } from '@allma/core-sdk';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FLOW_EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const LOG_RETENTION_DAYS_DEFAULT = 90;
const LOG_RETENTION_DAYS = process.env[ENV_VAR_NAMES.LOG_RETENTION_DAYS]
    ? parseInt(process.env[ENV_VAR_NAMES.LOG_RETENTION_DAYS] || '', 10)
    : LOG_RETENTION_DAYS_DEFAULT;


export const handler: Handler<ExecutionLoggerPayload, void> = async (event) => {
    let correlationId = 'unknown-correlation-id';
    if ('flowExecutionId' in event) {
        correlationId = event.flowExecutionId;
    } else if (event.action === 'CREATE_METADATA' || (event.action === 'LOG_STEP_EXECUTION' && event.record)) {
        correlationId = event.record.flowExecutionId;
    }

    log_info(`ExecutionLogger invoked`, { action: event.action }, correlationId);


    const parseResult = ExecutionLoggerPayloadSchema.safeParse(event);
    if (!parseResult.success) {
        log_error('Invalid payload received by ExecutionLogger.', { errors: parseResult.error.flatten(), rawEvent: event }, correlationId);
        return;
    }

    const payload = parseResult.data;
    const ttl = Math.floor(Date.now() / 1000) + (LOG_RETENTION_DAYS * 24 * 60 * 60);

    try {
        switch (payload.action) {
            case 'CREATE_METADATA': {
                const { record } = payload;
                const status = 'RUNNING';
                
                const itemToPut = {
                    ...record,
                    eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE,
                    itemType: ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
                    status: status,
                    overallStatus: status,
                    overallStartTime: record.startTime,
                    flow_sort_key: `v#${record.flowDefinitionVersion}#s#${status}#t#${record.startTime}`,
                    ttl: ttl,
                };
                
                const validatedItem = AllmaFlowExecutionRecordSchema.parse(itemToPut);
                await ddbDocClient.send(new PutCommand({ TableName: FLOW_EXECUTION_LOG_TABLE_NAME, Item: validatedItem }));
                log_info('Successfully created initial flow execution record.', {}, correlationId);
                break;
            }

            case 'UPDATE_FINAL_STATUS': {
                const { flowExecutionId, status, endTime, finalContextDataS3Pointer, errorInfo } = payload;
                
                const getResult = await ddbDocClient.send(new GetCommand({
                    TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
                    Key: { flowExecutionId, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE }
                }));
                if (!getResult.Item) {
                    throw new Error(`Cannot update final status. Metadata record for ${flowExecutionId} not found.`);
                }

                const updateExpressions: string[] = [
                    'SET #status = :status',
                    '#endTime = :endTime',
                    '#overallStatus = :status',
                    '#flow_sort_key = :flow_sort_key',
                ];
                 const expressionAttributeNames: Record<string, string> = {
                    '#status': 'status',
                    '#endTime': 'endTime',
                    '#overallStatus': 'overallStatus',
                    '#flow_sort_key': 'flow_sort_key',
                };
                const expressionAttributeValues: Record<string, any> = {
                    ':status': status,
                    ':endTime': endTime,
                    ':flow_sort_key': `v#${getResult.Item.flowDefinitionVersion}#s#${status}#t#${getResult.Item.startTime}`,
                };
                
                if (finalContextDataS3Pointer) {
                    updateExpressions.push('#s3pointer = :s3pointer');
                    expressionAttributeNames['#s3pointer'] = 'finalContextDataS3Pointer';
                    expressionAttributeValues[':s3pointer'] = finalContextDataS3Pointer;
                }
                if (errorInfo) {
                    updateExpressions.push('#errorInfo = :errorInfo');
                    expressionAttributeNames['#errorInfo'] = 'errorInfo';
                    expressionAttributeValues[':errorInfo'] = errorInfo;
                }
                
                await ddbDocClient.send(new UpdateCommand({
                    TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
                    Key: { 
                        flowExecutionId: flowExecutionId, 
                        eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE 
                    },
                    UpdateExpression: updateExpressions.join(', '),
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                }));
                log_info('Successfully updated flow execution record with final status.', { status }, correlationId);
                break;
            }

            // handles writing the minimal record.
            case 'LOG_STEP_EXECUTION': {
                const minimalStepData = payload.record;
                const attempt = minimalStepData.attemptNumber || 1;
                const eventTimestamp = minimalStepData.eventTimestamp;
                const sortKeyString = `STEP#${eventTimestamp}#${minimalStepData.stepInstanceId}#${attempt}#${minimalStepData.status}`;

                const itemToPut = {
                    ...minimalStepData,
                    eventTimestamp_stepInstanceId_attempt: sortKeyString,
                    itemType: ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
                    ttl: ttl,
                };
                
                const validatedRecord = AllmaStepExecutionRecordSchema.parse(itemToPut);

                await ddbDocClient.send(new PutCommand({
                    TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
                    Item: validatedRecord,
                }));
                log_info(`Successfully logged minimal step execution record for '${minimalStepData.stepInstanceId}'.`, { status: minimalStepData.status, eventTimestamp }, correlationId);
                break;
            }
        }
    } catch (e: any) {
        log_error('Failed to write to flow execution log table.', { error: e.message, name: e.name, stack: e.stack, payload: JSON.stringify(payload) }, correlationId);
    }
};