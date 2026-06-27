import { AttributeValue, DynamoDBClient, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
    ENV_VAR_NAMES, FlowExecutionDetails, PaginatedResponse, FlowExecutionSummary, AllmaFlowExecutionRecord,
    AllmaStepExecutionRecord, ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD, ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
    StepType, BranchStepsResponse, BranchExecutionGroup,
    FlowDefinition, ExecutionProgressNode, ExecutionProgressResponse, METADATA_SK_VALUE
} from '@allma/core-types';
import { log_error, log_warn, resolveS3Pointer } from '@allma/core-sdk';
import { loadFlowDefinition } from '../../allma-core/config-loader.js';

const TERMINAL_FLOW_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'] as const;
const STEP_REACHED_STATUSES = ['STARTED', 'COMPLETED', 'RETRYING_SFN', 'RETRYING_CONTENT'];
const STEP_TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'SKIPPED'];
const STEP_ACTIVE_STATUSES = ['STARTED', 'RETRYING_SFN', 'RETRYING_CONTENT'];

/**
 * Computes a live progress node for one flow execution from its metadata + step records and
 * (when available) its flow definition. Derived at read time: requires no orchestrator changes.
 *
 * Current step = the most recent active (STARTED/RETRYING) step event that has no terminal event
 * after it. Checkpoint progress = the highest-ordered declared checkpoint whose step has been
 * reached. Falls back to step-count progress when the flow declares no checkpoints.
 */
export function _computeExecutionProgress(
    metadata: AllmaFlowExecutionRecord,
    stepEvents: AllmaStepExecutionRecord[],
    flowDef: FlowDefinition | undefined,
): ExecutionProgressNode {
    const status = metadata.status;
    const isTerminal = (TERMINAL_FLOW_STATUSES as readonly string[]).includes(status);

    const sorted = [...stepEvents].sort((a, b) => a.eventTimestamp.localeCompare(b.eventTimestamp));

    // Latest terminal event timestamp per step, to decide whether an active step is still running.
    const latestTerminalByStep = new Map<string, string>();
    for (const e of sorted) {
        if (STEP_TERMINAL_STATUSES.includes(e.status)) latestTerminalByStep.set(e.stepInstanceId, e.eventTimestamp);
    }

    const completedStepIds = new Set(sorted.filter(e => e.status === 'COMPLETED').map(e => e.stepInstanceId));
    const reachedStepIds = new Set(sorted.filter(e => STEP_REACHED_STATUSES.includes(e.status)).map(e => e.stepInstanceId));
    const completedStepCount = completedStepIds.size;

    // Current step: walk newest-first for an active event with no later terminal event for that step.
    let currentStepEvent: AllmaStepExecutionRecord | undefined;
    if (!isTerminal) {
        for (let i = sorted.length - 1; i >= 0; i--) {
            const e = sorted[i];
            if (!STEP_ACTIVE_STATUSES.includes(e.status)) continue;
            const term = latestTerminalByStep.get(e.stepInstanceId);
            if (!term || term < e.eventTimestamp) { currentStepEvent = e; break; }
        }
    }

    const totalStepCount = flowDef ? Object.keys(flowDef.steps).length : undefined;

    // Declared checkpoints, ordered. `order` is optional; undefined sorts last but keeps definition order.
    const checkpointSteps = flowDef
        ? Object.entries(flowDef.steps)
            .filter(([, s]) => (s as any).checkpoint)
            .map(([stepInstanceId, s]) => ({ stepInstanceId, ...((s as any).checkpoint) }))
            .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
        : [];
    const totalCheckpoints = checkpointSteps.length;

    // Most advanced reached checkpoint (monotonic: take the last in sorted order that was reached).
    let currentCheckpoint: ExecutionProgressNode['currentCheckpoint'];
    let checkpointOrdinal = 0;
    for (let i = 0; i < checkpointSteps.length; i++) {
        if (reachedStepIds.has(checkpointSteps[i].stepInstanceId)) {
            const { id, label, order } = checkpointSteps[i];
            currentCheckpoint = { id, label, order, ordinal: i + 1 };
            checkpointOrdinal = i + 1;
        }
    }

    let progressPercent: number;
    if (status === 'COMPLETED') {
        progressPercent = 100; // clamp to 100% on success even if a late checkpoint was skipped
    } else if (totalCheckpoints > 0) {
        progressPercent = Math.round((100 * checkpointOrdinal) / totalCheckpoints);
    } else if (totalStepCount && totalStepCount > 0) {
        progressPercent = Math.round((100 * completedStepCount) / totalStepCount);
    } else {
        progressPercent = 0;
    }
    progressPercent = Math.max(0, Math.min(100, progressPercent));

    const currentStepDef = currentStepEvent && flowDef ? (flowDef.steps[currentStepEvent.stepInstanceId] as any) : undefined;
    const currentStepType = currentStepDef?.stepType ?? currentStepEvent?.stepType;
    const isWaiting = currentStepType === StepType.WAIT_FOR_EXTERNAL_EVENT || currentStepType === StepType.POLL_EXTERNAL_API;

    const currentStep = currentStepEvent
        ? {
            stepInstanceId: currentStepEvent.stepInstanceId,
            displayName: currentStepDef?.displayName,
            stepType: currentStepType,
        }
        : undefined;

    return {
        flowExecutionId: metadata.flowExecutionId,
        flowDefinitionId: metadata.flowDefinitionId,
        flowDefinitionVersion: metadata.flowDefinitionVersion,
        status,
        isWaiting,
        currentStep,
        currentCheckpoint,
        completedStepCount,
        totalStepCount,
        totalCheckpoints: flowDef ? totalCheckpoints : undefined,
        progressPercent,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        children: [],
    };
}

/**
 * True when the orchestrator has stamped live progress onto the metadata record (Pillar A). When
 * present, the metadata item is authoritative and lag-free, so the read API serves it directly
 * instead of deriving progress from (async, possibly-lagging) step records.
 */
function _isStamped(metadata: Partial<AllmaFlowExecutionRecord>): boolean {
    return metadata.progressUpdatedAt !== undefined;
}

/**
 * Builds a progress node directly from a stamped metadata record (or a GSI_ByRoot-projected item).
 * No step records or flow definition required.
 */
function _nodeFromStampedMetadata(m: Partial<AllmaFlowExecutionRecord> & { flowExecutionId: string; flowDefinitionId: string; status: AllmaFlowExecutionRecord['status']; startTime: string; }): ExecutionProgressNode {
    const status = m.status;
    const isTerminal = (TERMINAL_FLOW_STATUSES as readonly string[]).includes(status);
    const stepType = m.currentStepType;
    const isWaiting = !isTerminal && (stepType === StepType.WAIT_FOR_EXTERNAL_EVENT || stepType === StepType.POLL_EXTERNAL_API);

    let progressPercent = typeof m.progressPercent === 'number' ? m.progressPercent : 0;
    if (status === 'COMPLETED') progressPercent = 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));

    const currentStep = !isTerminal && m.currentStepInstanceId
        ? { stepInstanceId: m.currentStepInstanceId, displayName: m.currentStepDisplayName, stepType: m.currentStepType }
        : undefined;

    return {
        flowExecutionId: m.flowExecutionId,
        flowDefinitionId: m.flowDefinitionId,
        flowDefinitionVersion: m.flowDefinitionVersion,
        executionKind: m.executionKind ?? 'ROOT',
        parentStepInstanceId: m.parentStepInstanceId,
        depth: m.depth ?? 0,
        status,
        isWaiting,
        currentStep,
        currentCheckpoint: m.currentCheckpoint,
        completedStepCount: m.completedStepCount ?? 0,
        totalStepCount: m.totalStepCount,
        totalCheckpoints: m.totalCheckpoints,
        progressPercent,
        startTime: m.startTime,
        endTime: m.endTime,
        children: [],
    };
}

/** A one-line headline summarising a single node's current work, for compact status widgets. */
function _headlineFromNode(node: ExecutionProgressNode): ExecutionProgressResponse['headline'] {
    const label =
        node.currentCheckpoint?.label ??
        node.currentStep?.displayName ??
        node.currentStep?.stepInstanceId ??
        (node.status === 'COMPLETED' ? 'Completed' : node.status);
    return { executionId: node.flowExecutionId, label, percent: node.progressPercent, status: node.status, isWaiting: node.isWaiting };
}

const EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Fetches a single execution's METADATA item directly (cheap, for the progress endpoint). */
async function _getMetadataItem(flowExecutionId: string): Promise<AllmaFlowExecutionRecord | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
        TableName: EXECUTION_LOG_TABLE_NAME,
        Key: { flowExecutionId, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE },
    }));
    return (Item as AllmaFlowExecutionRecord) ?? null;
}

/** Queries every execution node in a tree (root + descendants) via GSI_ByRoot in one pass. */
async function _queryTreeNodes(rootFlowExecutionId: string): Promise<any[]> {
    let items: any[] = [];
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined;
    do {
        const result: QueryCommandOutput = await ddbDocClient.send(new QueryCommand({
            TableName: EXECUTION_LOG_TABLE_NAME,
            IndexName: 'GSI_ByRoot',
            KeyConditionExpression: 'rootFlowExecutionId = :r',
            ExpressionAttributeValues: { ':r': rootFlowExecutionId },
            ExclusiveStartKey: lastEvaluatedKey,
        }));
        if (result.Items) items = items.concat(result.Items);
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}

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
                // EXPLICIT FALSE: Do not skip size limit on UI logs endpoints
                const fullRecordFromS3 = await resolveS3Pointer(record.fullRecordS3Pointer, correlationId, false); 
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
                // EXPLICIT FALSE: Enforce 4MB limit to protect the API Gateway endpoint
                resolvedFinalContextData = await resolveS3Pointer(metadata.finalContextDataS3Pointer, correlationId, false);
            } catch (e: any) {
                log_error(`Failed to resolve final context S3 pointer`, { pointer: metadata.finalContextDataS3Pointer, error: e.message }, correlationId);
                (metadata as any)._s3_error_final_context = `Failed to load: ${e.message}`;
            }
        }
        return { metadata, steps: consolidatedSteps, resolvedFinalContextData };
    },

    /**
     * Returns live progress for an execution: current step, stage (checkpoint), completed/total
     * steps and a percentage.
     *
     * `mode='single'` (default) returns just the requested execution's node. It prefers the
     * orchestrator-stamped metadata (Pillar A) — a single, lag-free GetItem — and falls back to
     * deriving progress from step records for executions predating the stamping (or before the
     * first stamp lands).
     *
     * `mode='tree'` assembles the whole execution tree (root + sub-flows) from a single
     * GSI_ByRoot query (Pillar B): each node carries its own progress, nested under the parent
     * that launched it, with a headline pointing at the deepest active leaf.
     */
    async getExecutionProgress(flowExecutionId: string, correlationId: string, mode: 'single' | 'tree' = 'single'): Promise<ExecutionProgressResponse | null> {
        const metadata = await _getMetadataItem(flowExecutionId);
        if (!metadata) return null;

        if (mode === 'tree') {
            return this._buildExecutionTree(metadata, correlationId);
        }

        const root = await this._buildProgressNode(metadata, correlationId);
        return { root, headline: _headlineFromNode(root) };
    },

    /**
     * Builds one progress node, preferring stamped metadata and falling back to read-time
     * derivation from step records (+ flow definition) for un-stamped/legacy executions.
     */
    async _buildProgressNode(metadata: AllmaFlowExecutionRecord, correlationId: string): Promise<ExecutionProgressNode> {
        if (_isStamped(metadata)) {
            return _nodeFromStampedMetadata(metadata);
        }

        // Fallback: derive from the (minimal) step records + flow definition. No S3 fetch, so the
        // endpoint stays cheap to poll. Requires execution logging to have been enabled.
        const allItems = await _getExecutionRecords(metadata.flowExecutionId);
        const mainLevelStepEvents = allItems.filter(
            item => item.itemType === ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD && !item.branchId,
        ) as AllmaStepExecutionRecord[];

        let flowDef: FlowDefinition | undefined;
        try {
            flowDef = await loadFlowDefinition(metadata.flowDefinitionId, metadata.flowDefinitionVersion, correlationId);
        } catch (e: any) {
            log_warn('Could not load flow definition for progress computation; returning partial progress.', { flowExecutionId: metadata.flowExecutionId, error: e.message }, correlationId);
        }

        return _computeExecutionProgress(metadata, mainLevelStepEvents, flowDef);
    },

    /**
     * Assembles the nested execution tree rooted at the requested execution's root. Falls back to
     * a single-node tree when the execution predates tree linkage (no GSI rows).
     */
    async _buildExecutionTree(requested: AllmaFlowExecutionRecord, correlationId: string): Promise<ExecutionProgressResponse> {
        const rootId = requested.rootFlowExecutionId ?? requested.flowExecutionId;
        const items = await _queryTreeNodes(rootId);

        // No linkage rows (pre-existing execution) → degrade to a single-node tree.
        if (items.length === 0) {
            const node = await this._buildProgressNode(requested, correlationId);
            return { root: node, headline: _headlineFromNode(node) };
        }

        const byId = new Map<string, ExecutionProgressNode>();
        for (const item of items) {
            byId.set(item.flowExecutionId, _nodeFromStampedMetadata(item));
        }

        // The root may not appear in the index if it predates linkage but a child points at it;
        // build it from its own metadata so the tree always has a root.
        let rootNode = byId.get(rootId);
        if (!rootNode) {
            const rootMeta = rootId === requested.flowExecutionId ? requested : await _getMetadataItem(rootId);
            rootNode = rootMeta ? await this._buildProgressNode(rootMeta, correlationId) : undefined;
            if (rootNode) byId.set(rootId, rootNode);
        }
        if (!rootNode) {
            // Should not happen, but never fail the request: fall back to the requested node.
            const node = await this._buildProgressNode(requested, correlationId);
            return { root: node, headline: _headlineFromNode(node) };
        }

        // Nest each non-root node under the parent that launched it (or the root if the parent is
        // missing from the tree, e.g. a deeper grandchild whose parent predates linkage).
        for (const item of items) {
            if (item.flowExecutionId === rootId) continue;
            const node = byId.get(item.flowExecutionId)!;
            const parent = (item.parentFlowExecutionId && byId.get(item.parentFlowExecutionId)) || rootNode;
            parent.children.push(node);
        }

        // Stable order: by start time within each parent.
        for (const node of byId.values()) {
            node.children.sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        // Headline = deepest active (non-terminal) leaf, else the root.
        const active = Array.from(byId.values()).filter(n => !(TERMINAL_FLOW_STATUSES as readonly string[]).includes(n.status));
        const headlineNode = active.length
            ? active.reduce((a, b) => ((b.depth ?? 0) > (a.depth ?? 0) ? b : a))
            : rootNode;

        return { root: rootNode, headline: _headlineFromNode(headlineNode) };
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

        // Take the latest attempt if attemptNumber wasn't specified.
        matchingSteps.sort((a, b) => b.eventTimestamp.localeCompare(a.eventTimestamp));
        const latestEvent = matchingSteps[0];

        // A single logical step is logged as MULTIPLE events (e.g. STARTED, then COMPLETED/FAILED,
        // plus any retry events), each with its own eventTimestamp, sort key and S3 pointer. The input
        // context (`inputMappingContext`) is captured on the STARTED event, while output/error context
        // lives on the terminal event. Resolving a single event's record therefore drops whichever
        // context lives on the others — which is why a failed step previously rendered with an empty
        // input context. Resolve and consolidate ALL events for this step, identically to
        // getExecutionDetails, so the returned record carries the full merged context.
        const fullEvents = await resolveFullStepRecords(matchingSteps, correlationId ?? flowExecutionId);
        const consolidatedSteps = consolidateStepEvents(fullEvents);

        // Return the consolidated record for the same attempt/branch as the latest event.
        const target = consolidatedSteps.find(s =>
            s.stepInstanceId === latestEvent.stepInstanceId &&
            (s.attemptNumber ?? 1) === (latestEvent.attemptNumber ?? 1) &&
            (s.branchExecutionId ?? null) === (latestEvent.branchExecutionId ?? null)
        );

        return target ?? consolidatedSteps[0] ?? latestEvent ?? null;
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
            ScanIndexForward: false,
            KeyConditionExpression: 'flowDefinitionId = :pk',
            FilterExpression: filterExpressions.join(' AND '),
            ExpressionAttributeValues: expressionAttributeValues,
        };
        if (Object.keys(expressionAttributeNames).length > 0) {
            queryParams.ExpressionAttributeNames = expressionAttributeNames;
        }

        // GSI_ByFlow_StartTime is keyed on (flowDefinitionId, startTime). Step-execution records are
        // denormalized with both of those attributes, so they also land in this index even though
        // they are filtered out by `itemType`. Because DynamoDB applies `Limit` *before* the
        // FilterExpression, a single bounded query can return a page made entirely of step records,
        // yielding an empty result for busy flows. We therefore page through the index, accumulating
        // matching flow-execution records until the requested page size is filled or the partition is
        // exhausted, and derive the nextToken from the last record we actually return.
        const collected: Record<string, any>[] = [];
        let lastEvaluatedKey = exclusiveStartKey;
        let nextToken: string | undefined;
        // Safeguard against unbounded scanning of a partition dominated by step records.
        const MAX_PAGES = 20;

        for (let page = 0; page < MAX_PAGES; page++) {
            const { Items, LastEvaluatedKey }: QueryCommandOutput = await ddbDocClient.send(
                new QueryCommand({ ...queryParams, ExclusiveStartKey: lastEvaluatedKey })
            );

            for (const item of Items || []) {
                collected.push(item);
                if (collected.length === pagination.limit) {
                    // Resume the next page immediately after this record. ExclusiveStartKey for a GSI
                    // query must carry both the index keys and the base-table primary keys.
                    nextToken = Buffer.from(JSON.stringify({
                        flowDefinitionId,
                        startTime: item.startTime,
                        flowExecutionId: item.flowExecutionId,
                        eventTimestamp_stepInstanceId_attempt: item.eventTimestamp_stepInstanceId_attempt,
                    })).toString('base64');
                    break;
                }
            }

            if (nextToken) break;

            lastEvaluatedKey = LastEvaluatedKey;
            if (!lastEvaluatedKey) break;

            // Hit the page cap before filling the page: hand back the raw cursor so the caller can
            // continue from exactly where we stopped rather than silently dropping executions.
            if (page === MAX_PAGES - 1) {
                nextToken = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
            }
        }

        const items: FlowExecutionSummary[] = collected.map(item => ({
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
            ...(nextToken && { nextToken })
        };
    }

};