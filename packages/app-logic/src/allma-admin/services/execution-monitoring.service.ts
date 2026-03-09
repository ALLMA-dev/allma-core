import { AttributeValue, DynamoDBClient, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import {
    ENV_VAR_NAMES, FlowExecutionDetails, PaginatedResponse, FlowExecutionSummary, AllmaFlowExecutionRecord, 
    AllmaStepExecutionRecord, ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD, ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD, 
    StepType, BranchStepsResponse, BranchExecutionGroup
} from '@allma/core-types';
import { log_error, resolveS3Pointer } from '@allma/core-sdk';

const EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Fetches all raw DynamoDB records for a single flow execution.
 * This is a private helper to avoid redundant queries within the service.
 */
async function _getExecutionRecords(flowExecutionId: string): Promise<any[]> {
    let allItems: any[] = [];
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

    do {
        const result: QueryCommandOutput = await ddbDocClient.send(new QueryCommand({
            TableName: EXECUTION_LOG_TABLE_NAME,
            KeyConditionExpression: 'flowExecutionId = :pk',
            ExpressionAttributeValues: { ':pk': flowExecutionId },
            ExclusiveStartKey: lastEvaluatedKey,
        }));
        if (result.Items) {
            allItems = allItems.concat(result.Items);
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    return allItems;
}

/**
 * Fetches full records from S3 for a list of minimal DB records.
 * Evaluates size on the fly to avoid APIGateway 413 limits and OOM errors.
 */
async function resolveFullStepRecords(
    minimalRecords: AllmaStepExecutionRecord[],
    correlationId: string
): Promise<AllmaStepExecutionRecord[]> {
    const CHUNK_SIZE = 50;
    const results: AllmaStepExecutionRecord[] = [];
    let cumulativeSize = 0;
    const MAX_CUMULATIVE_SIZE = 4 * 1024 * 1024; // 4MB safe limit
    
    for (let i = 0; i < minimalRecords.length; i += CHUNK_SIZE) {
        const chunk = minimalRecords.slice(i, i + CHUNK_SIZE);
        
        // Fetch chunk in parallel for speed
        const fetchPromises = chunk.map(async (record) => {
            if (!record.fullRecordS3Pointer) return { record, fullRecordFromS3: null };
            
            // Optimization: Skip fetching if limit is already passed 
            if (cumulativeSize > MAX_CUMULATIVE_SIZE) return { record, fullRecordFromS3: null, skipped: true };
            
            try {
                const fullRecordFromS3 = await resolveS3Pointer(record.fullRecordS3Pointer, correlationId); // Do not skip size limit on individual objects
                return { record, fullRecordFromS3 };
            } catch (e: any) {
                log_error(`Failed to resolve S3 pointer for step record`, { pointer: record.fullRecordS3Pointer, error: e.message }, correlationId);
                return { record, fullRecordFromS3: null, error: e.message };
            }
        });
        
        const fetchedResults = await Promise.all(fetchPromises);
        
        // Process records sequentially to manage running size perfectly
        for (const { record, fullRecordFromS3, skipped, error } of fetchedResults) {
            if (skipped || cumulativeSize > MAX_CUMULATIVE_SIZE) {
                results.push({ ...record, _detailsOmittedForSize: true } as any);
                continue;
            }
            
            if (error) {
                results.push({ ...record, _s3_error: `Failed to load full record from S3: ${error}` } as any);
                continue;
            }
            
            if (fullRecordFromS3) {
                // Automatically handle if S3 object was > 4MB individually
                if (fullRecordFromS3._is_large_s3_payload) {
                    results.push({ 
                        ...record, 
                        _detailsOmittedForSize: true, 
                        _large_payload_link: fullRecordFromS3.presignedUrl,
                        _s3_error: `Step details too large (${(fullRecordFromS3.sizeBytes / 1024 / 1024).toFixed(2)} MB) to load inline. Please download the log file.` 
                    } as any);
                    continue;
                }
                
                const recordString = JSON.stringify(fullRecordFromS3);
                const recordSize = Buffer.byteLength(recordString, 'utf-8');

                if (cumulativeSize + recordSize > MAX_CUMULATIVE_SIZE && cumulativeSize > 0) {
                     results.push({ ...record, _detailsOmittedForSize: true } as any);
                     continue;
                }
                
                cumulativeSize += recordSize;
                results.push({ ...fullRecordFromS3, ...record } as any);
            } else {
                results.push(record);
            }
        }
    }
    
    return results;
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
                agg.stepInstanceId === step.stepInstanceId && new Date(agg.startTime).getTime() >= new Date(step.startTime).getTime()
            );
            if (aggregator) {
                step.endTime = aggregator.endTime;
                step.durationMs = aggregator.endTime ? new Date(aggregator.endTime).getTime() - new Date(step.startTime).getTime() : step.durationMs;
                step.status = aggregator.status || 'COMPLETED'; // Align status (e.g. FAILED if aggregation failed)
                const fullAggregatorRecord = aggregator as any;
                
                if (fullAggregatorRecord.outputData) (step as any).outputData = fullAggregatorRecord.outputData;
                if (fullAggregatorRecord.outputMappingContext) (step as any).outputMappingContext = fullAggregatorRecord.outputMappingContext;
                if (fullAggregatorRecord.errorInfo) (step as any).errorInfo = fullAggregatorRecord.errorInfo;
                
                if (fullAggregatorRecord.mappingEvents) {
                    (step as any).mappingEvents = [...((step as any).mappingEvents || []), ...fullAggregatorRecord.mappingEvents];
                }
                if (fullAggregatorRecord.logDetails) {
                    (step as any).logDetails = { ...((step as any).logDetails || {}), ...fullAggregatorRecord.logDetails };
                }

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
                // If it's larger than the 4MB limit, resolveS3Pointer handles generating a wrapper object + presigned url automatically
                resolvedFinalContextData = await resolveS3Pointer(metadata.finalContextDataS3Pointer, correlationId);
            } catch (e: any) {
                log_error(`Failed to resolve final context S3 pointer`, { pointer: metadata.finalContextDataS3Pointer, error: e.message }, correlationId);
                (metadata as any)._s3_error_final_context = `Failed to load: ${e.message}`;
            }
        }
        return { metadata, steps: consolidatedSteps, resolvedFinalContextData };
    },
    
    async getStepRecordDetails(flowExecutionId: string, stepInstanceId: string, attemptNumber?: number, branchExecutionId?: string, correlationId?: string): Promise<AllmaStepExecutionRecord | null> {
        const queryParams: QueryCommandInput = {
            TableName: EXECUTION_LOG_TABLE_NAME,
            KeyConditionExpression: 'flowExecutionId = :pk AND begins_with(eventTimestamp_stepInstanceId_attempt, :skPrefix)',
            ExpressionAttributeValues: { ':pk': flowExecutionId, ':skPrefix': 'STEP#' },
        };
        const { Items } = await ddbDocClient.send(new QueryCommand(queryParams));
        if (!Items || Items.length === 0) return null;

        const matchingSteps = Items.filter(item => {
            if (item.stepInstanceId !== stepInstanceId) return false;
            if (attemptNumber && item.attemptNumber !== attemptNumber) return false;
            if (branchExecutionId && item.branchExecutionId !== branchExecutionId) return false;
            return true;
        }) as AllmaStepExecutionRecord[];

        if (matchingSteps.length === 0) return null;
        
        // Take the latest attempt if attemptNumber wasn't specified
        matchingSteps.sort((a, b) => b.eventTimestamp.localeCompare(a.eventTimestamp));
        const stepToFetch = matchingSteps[0];

        if (stepToFetch.fullRecordS3Pointer) {
            try {
                const fullRecordFromS3 = await resolveS3Pointer(stepToFetch.fullRecordS3Pointer, correlationId);
                
                if (fullRecordFromS3?._is_large_s3_payload) {
                    return { 
                        ...stepToFetch, 
                        _detailsOmittedForSize: true, 
                        _large_payload_link: fullRecordFromS3.presignedUrl,
                        _s3_error: `Step details too large (${(fullRecordFromS3.sizeBytes / 1024 / 1024).toFixed(2)} MB) to load inline. Please download the log file.` 
                    } as any;
                }

                return { ...fullRecordFromS3, ...stepToFetch };
            } catch (e: any) {
                log_error(`Failed to resolve S3 pointer for specific step record`, { pointer: stepToFetch.fullRecordS3Pointer, error: e.message }, correlationId);
                return { ...stepToFetch, _s3_error: `Failed to load full record from S3: ${e.message}` } as any;
            }
        }
        
        return stepToFetch;
    },

    /**
     * Fetches branch steps for a specific parallel fork. Includes pagination and smart sorting
     * (failed branches first) to ensure the API payload stays well within limits.
     */
    async getBranchSteps(flowExecutionId: string, parentStepInstanceId: string, parentStepStartTime: string, correlationId: string, limit: number = 30, offset: number = 0): Promise<BranchStepsResponse> {
        const allItems = await _getExecutionRecords(flowExecutionId);
        if (allItems.length === 0) return { groups: [], totalBranches: 0, hasMore: false };

        const aggregator = allItems.find(item =>
            item.stepInstanceId === parentStepInstanceId &&
            item.stepType === 'PARALLEL_AGGREGATOR' &&
            new Date(item.startTime).getTime() >= new Date(parentStepStartTime).getTime()
        );

        const startTimeMs = new Date(parentStepStartTime).getTime();
        const endTimeMs = aggregator?.endTime ? new Date(aggregator.endTime).getTime() : Infinity;

        const branchStepEvents = allItems.filter(item =>
            item.branchId &&
            new Date(item.startTime).getTime() >= startTimeMs &&
            new Date(item.startTime).getTime() <= endTimeMs
        ) as AllmaStepExecutionRecord[];

        // 1. Group raw DB records by branch execution ID to identify complete branches
        const groupsMap = new Map<string, { branchId: string, executionId: string, steps: AllmaStepExecutionRecord[], hasFailedStep: boolean }>();

        for (const step of branchStepEvents) {
            const executionKey = step.branchExecutionId || `${step.branchId}-${step.startTime}`;
            if (!groupsMap.has(executionKey)) {
                groupsMap.set(executionKey, { branchId: step.branchId || 'unknown', executionId: executionKey, steps: [], hasFailedStep: false });
            }
            const group = groupsMap.get(executionKey)!;
            group.steps.push(step);
            if (step.status === 'FAILED') {
                group.hasFailedStep = true;
            }
        }

        const allGroups = Array.from(groupsMap.values());

        // 2. Smart Sort: Branches with FAILED steps float to the top, then chronological.
        allGroups.sort((a, b) => {
            if (a.hasFailedStep && !b.hasFailedStep) return -1;
            if (!a.hasFailedStep && b.hasFailedStep) return 1;
            const startTimeA = a.steps[0]?.startTime || '';
            const startTimeB = b.steps[0]?.startTime || '';
            return startTimeA.localeCompare(startTimeB);
        });

        const totalBranches = allGroups.length;
        
        // 3. Paginate BEFORE fetching heavy S3 details
        const slicedGroups = allGroups.slice(offset, offset + limit);

        // 4. Hydrate ONLY the selected page of branches from S3
        const stepsToHydrate = slicedGroups.flatMap(g => g.steps);
        const hydratedSteps = await resolveFullStepRecords(stepsToHydrate, correlationId);
        const consolidatedSteps = consolidateStepEvents(hydratedSteps);

        // 5. Re-assemble the final grouped array, preserving the smart sort order
        const finalGroupsArray: BranchExecutionGroup[] = [];
        
        for (const sg of slicedGroups) {
            const stepsForThisGroup = consolidatedSteps.filter(s => 
                (s.branchExecutionId || `${s.branchId}-${s.startTime}`) === sg.executionId
            );
            if (stepsForThisGroup.length > 0) {
                finalGroupsArray.push({
                    executionKey: sg.executionId,
                    branchId: sg.branchId,
                    steps: stepsForThisGroup
                });
            }
        }

        return {
            groups: finalGroupsArray,
            totalBranches,
            hasMore: offset + limit < totalBranches
        };
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