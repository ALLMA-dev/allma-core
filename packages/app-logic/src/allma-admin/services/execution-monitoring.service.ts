import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import {
    ENV_VAR_NAMES, FlowExecutionDetails, PaginatedResponse, FlowExecutionSummary, AllmaFlowExecutionRecord, 
    AllmaStepExecutionRecord, ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD, ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD, 
    StepType, BranchStepsResponse
} from '@allma/core-types';
import { log_error, resolveS3Pointer } from '@allma/core-sdk';

const EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Fetches all raw DynamoDB records for a single flow execution.
 * This is a private helper to avoid redundant queries within the service.
 */
async function _getExecutionRecords(flowExecutionId: string): Promise<any[]> {
    const { Items } = await ddbDocClient.send(new QueryCommand({
        TableName: EXECUTION_LOG_TABLE_NAME,
        KeyConditionExpression: 'flowExecutionId = :pk',
        ExpressionAttributeValues: { ':pk': flowExecutionId },
    }));
    return Items || [];
}

/**
 * Fetches full records from S3 for a list of minimal DB records.
 */
async function resolveFullStepRecords(
    minimalRecords: AllmaStepExecutionRecord[],
    correlationId: string
): Promise<AllmaStepExecutionRecord[]> {
    const resolutionPromises = minimalRecords.map(async (record) => {
        if (record.fullRecordS3Pointer) {
            try {
                const fullRecordFromS3 = await resolveS3Pointer(record.fullRecordS3Pointer, correlationId);
                return { ...fullRecordFromS3, ...record };
            } catch (e: any) {
                log_error(`Failed to resolve S3 pointer for step record`, { pointer: record.fullRecordS3Pointer, error: e.message }, correlationId);
                return { ...record, _s3_error: `Failed to load full record from S3: ${e.message}` };
            }
        }
        return record;
    });
    return Promise.all(resolutionPromises);
}

/**
 * Consolidates raw step events into logical step executions.
 */
function consolidateStepEvents(allFullStepEvents: AllmaStepExecutionRecord[]): AllmaStepExecutionRecord[] {
    const consolidatedStepsMap = new Map<string, AllmaStepExecutionRecord>();
    const aggregatorEvents = new Map<string, AllmaStepExecutionRecord>();

    allFullStepEvents.sort((a, b) => a.eventTimestamp.localeCompare(b.eventTimestamp));

    for (const fullEvent of allFullStepEvents) {
        if (fullEvent.stepType === 'PARALLEL_AGGREGATOR') {
            const key = `${fullEvent.stepInstanceId}-${fullEvent.startTime}`;
            aggregatorEvents.set(key, fullEvent);
            continue;
        }

        const key = `${fullEvent.branchId || 'main'}-${fullEvent.stepInstanceId}-${fullEvent.attemptNumber || 1}-${fullEvent.startTime}`;
        const existingRecord = consolidatedStepsMap.get(key);
        const stepConfig = (existingRecord as any)?.stepInstanceConfig || (fullEvent as any)?.stepInstanceConfig;
        const mergedRecord = { ...(existingRecord || {}), ...fullEvent };
        if (stepConfig) {
            (mergedRecord as any).stepInstanceConfig = stepConfig;
        }
        consolidatedStepsMap.set(key, mergedRecord);
    }

    for (const step of consolidatedStepsMap.values()) {
        if (step.stepType === StepType.PARALLEL_FORK_MANAGER) {
            const aggregator = Array.from(aggregatorEvents.values()).find(agg =>
                agg.stepInstanceId === step.stepInstanceId && new Date(agg.startTime) > new Date(step.startTime)
            );
            if (aggregator) {
                step.endTime = aggregator.endTime;
                step.durationMs = aggregator.endTime ? new Date(aggregator.endTime).getTime() - new Date(step.startTime).getTime() : step.durationMs;
                step.status = 'COMPLETED';
                const fullAggregatorRecord = aggregator as any;
                if (fullAggregatorRecord.outputData) (step as any).outputData = fullAggregatorRecord.outputData;
                if (fullAggregatorRecord.outputMappingContext) (step as any).outputMappingContext = fullAggregatorRecord.outputMappingContext;
                aggregatorEvents.delete(`${aggregator.stepInstanceId}-${aggregator.startTime}`);
            }
        }
    }

    const consolidatedSteps = Array.from(consolidatedStepsMap.values());
    consolidatedSteps.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return consolidatedSteps;
}


export const ExecutionMonitoringService = {

    async getExecutionDetails(flowExecutionId: string, correlationId: string): Promise<FlowExecutionDetails | null> {
        const allItems = await _getExecutionRecords(flowExecutionId);
        if (allItems.length === 0) return null;

        const metadata = allItems.find(item => item.itemType === ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD) as AllmaFlowExecutionRecord;
        if (!metadata) return null;

        const mainLevelStepEvents = allItems.filter(item => item.itemType === ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD && !item.branchId) as AllmaStepExecutionRecord[];
        const allFullStepEvents = await resolveFullStepRecords(mainLevelStepEvents, correlationId);
        const consolidatedSteps = consolidateStepEvents(allFullStepEvents);

        let resolvedFinalContextData: Record<string, any> | undefined;
        if (metadata.finalContextDataS3Pointer) {
            try {
                resolvedFinalContextData = await resolveS3Pointer(metadata.finalContextDataS3Pointer, correlationId);
            } catch (e: any) {
                log_error(`Failed to resolve final context S3 pointer`, { pointer: metadata.finalContextDataS3Pointer, error: e.message }, correlationId);
                (metadata as any)._s3_error_final_context = `Failed to load: ${e.message}`;
            }
        }
        return { metadata, steps: consolidatedSteps, resolvedFinalContextData };
    },

    async getBranchSteps(flowExecutionId: string, parentStepInstanceId: string, parentStepStartTime: string, correlationId: string): Promise<BranchStepsResponse> {
        const allItems = await _getExecutionRecords(flowExecutionId);
        if (allItems.length === 0) return {};

        const aggregator = allItems.find(item =>
            item.stepInstanceId === parentStepInstanceId &&
            item.stepType === 'PARALLEL_AGGREGATOR' &&
            new Date(item.startTime) > new Date(parentStepStartTime)
        );

        const startTime = new Date(parentStepStartTime).getTime();
        const endTime = aggregator ? new Date(aggregator.startTime).getTime() : Infinity;

        const branchStepEvents = allItems.filter(item =>
            item.branchId &&
            new Date(item.startTime).getTime() >= startTime &&
            new Date(item.startTime).getTime() < endTime
        ) as AllmaStepExecutionRecord[];

        const fullBranchStepEvents = await resolveFullStepRecords(branchStepEvents, correlationId);
        const consolidatedBranchSteps = consolidateStepEvents(fullBranchStepEvents);

        return consolidatedBranchSteps.reduce<BranchStepsResponse>((acc, step) => {
            const executionKey = step.branchExecutionId || `${step.branchId}-${step.startTime}`;
            if (!acc[executionKey]) {
                acc[executionKey] = { branchId: step.branchId || 'unknown_branch', steps: [] };
            }
            acc[executionKey].steps.push(step);
            return acc;
        }, {});
    },

    /**
     * Lists all executions for a given flow definition, with optional filters.
     */
    async listExecutions(
        flowDefinitionId: string, 
        filters: { flowVersion?: string | undefined; status?: string | undefined; },
        pagination: { limit: number; nextToken?: string | undefined; }
    ): Promise<PaginatedResponse<FlowExecutionSummary>> {
        let exclusiveStartKey;
        if (pagination.nextToken) {
            try {
                exclusiveStartKey = JSON.parse(Buffer.from(pagination.nextToken, 'base64').toString('utf-8'));
            } catch (e) {
                throw { name: 'ValidationError', message: 'Invalid nextToken.' };
            }
        }

        const filterExpressions: string[] = ['itemType = :itemType'];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {
            ':pk': flowDefinitionId,
            ':itemType': ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
        };

        if (filters.flowVersion) {
            filterExpressions.push('flowDefinitionVersion = :v');
            expressionAttributeValues[':v'] = Number(filters.flowVersion);
        }
        if (filters.status) {
            filterExpressions.push('#status = :s');
            expressionAttributeNames['#status'] = 'status';
            expressionAttributeValues[':s'] = filters.status;
        }

        const queryParams: QueryCommandInput = {
            TableName: EXECUTION_LOG_TABLE_NAME,
            IndexName: 'GSI_ByFlow_StartTime',
            Limit: pagination.limit,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
            KeyConditionExpression: 'flowDefinitionId = :pk',
            FilterExpression: filterExpressions.join(' AND '),
            ExpressionAttributeValues: expressionAttributeValues,
        };
        if (Object.keys(expressionAttributeNames).length > 0) {
            queryParams.ExpressionAttributeNames = expressionAttributeNames;
        }

        const { Items, LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand(queryParams));
        const items: FlowExecutionSummary[] = (Items || []).map(item => ({
            flowExecutionId: item.flowExecutionId,
            status: item.status,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMs: item.startTime && item.endTime ? new Date(item.endTime).getTime() - new Date(item.startTime).getTime() : undefined,
            triggerSource: item.triggerSource,
            enableExecutionLogs: item.enableExecutionLogs,
            flowDefinitionVersion: item.flowDefinitionVersion,
        }));

        return {
            items,
            ...(LastEvaluatedKey && { nextToken: Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') })
        };
    }

};
