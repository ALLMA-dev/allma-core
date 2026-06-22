import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import {
    ENV_VAR_NAMES,
    ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
    StepStatsResponse,
    StepStatsRange,
    StepTypeBucket,
    FlowStepBucket,
    StepTimeBucket,
} from '@allma/core-types';
import { subDays, subHours } from 'date-fns';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FLOW_EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;

/** GSI dedicated to querying step-execution records by time (PK itemType, SK startTime). */
const GSI_NAME = 'GSI_StepStats_ByTime';

/**
 * Only terminal step events represent a completed unit of work. Counting these (rather than
 * STARTED / RETRYING_* events) avoids double-counting a step that emits STARTED then COMPLETED,
 * and avoids inflating counts on retries.
 */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);

const UNKNOWN_FLOW = 'UNKNOWN';

export interface StepStatsFilters {
    stepType?: string;
    flowDefinitionId?: string;
}

/** A raw step-execution record as projected by the GSI (only the attributes we aggregate). */
interface StepRecord {
    stepType: string;
    status: string;
    startTime: string;
    durationMs?: number;
    flowDefinitionId?: string;
    inputTokens?: number;
    outputTokens?: number;
}

/**
 * Queries every step-execution record in the given time window from the GSI, paginating until
 * exhausted. NOTE: this reads all step records in the window (one GSI partition); see the API
 * docs for the scale caveat and the rollup-table migration path.
 */
const queryStepRecordsByTime = async (startTime: string, endTime: string): Promise<StepRecord[]> => {
    let allItems: StepRecord[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        const queryParams: QueryCommandInput = {
            TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: 'itemType = :itemType AND startTime BETWEEN :start AND :end',
            ExpressionAttributeValues: {
                ':itemType': ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
                ':start': startTime,
                ':end': endTime,
            },
            ExclusiveStartKey: lastEvaluatedKey,
        };

        const { Items, LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand(queryParams));
        if (Items) {
            allItems = allItems.concat(Items as StepRecord[]);
        }
        lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
};

/** Keeps only terminal events that match the optional step-type / flow filters. */
const selectRecords = (records: StepRecord[], filters: StepStatsFilters, from: Date): StepRecord[] => {
    const fromIso = from.toISOString();
    return records.filter((r) => {
        if (!TERMINAL_STATUSES.has(r.status)) return false;
        if (r.startTime < fromIso) return false;
        if (filters.stepType && r.stepType !== filters.stepType) return false;
        if (filters.flowDefinitionId && (r.flowDefinitionId ?? UNKNOWN_FLOW) !== filters.flowDefinitionId) return false;
        return true;
    });
};

/** Accumulates count / failCount / duration / tokens for a single bucket key. */
interface Accumulator {
    count: number;
    failCount: number;
    durationSumMs: number;
    durationCount: number;
    inputTokens: number;
    outputTokens: number;
}

const newAccumulator = (): Accumulator => ({
    count: 0,
    failCount: 0,
    durationSumMs: 0,
    durationCount: 0,
    inputTokens: 0,
    outputTokens: 0,
});

const accumulate = (acc: Accumulator, r: StepRecord): void => {
    acc.count += 1;
    if (r.status === 'FAILED') acc.failCount += 1;
    if (typeof r.durationMs === 'number') {
        acc.durationSumMs += r.durationMs;
        acc.durationCount += 1;
    }
    if (typeof r.inputTokens === 'number') acc.inputTokens += r.inputTokens;
    if (typeof r.outputTokens === 'number') acc.outputTokens += r.outputTokens;
};

const toStepTypeBucket = (stepType: string, acc: Accumulator): StepTypeBucket => ({
    stepType,
    count: acc.count,
    failCount: acc.failCount,
    avgDurationMs: acc.durationCount > 0 ? acc.durationSumMs / acc.durationCount : 0,
    inputTokens: acc.inputTokens,
    outputTokens: acc.outputTokens,
});

/** Builds the by-step-type and by-flow breakdowns for a set of already-filtered records. */
const buildRange = (records: StepRecord[]): StepStatsRange => {
    const byType = new Map<string, Accumulator>();
    const byFlow = new Map<string, { total: Accumulator; types: Map<string, Accumulator> }>();

    for (const r of records) {
        const typeAcc = byType.get(r.stepType) ?? newAccumulator();
        accumulate(typeAcc, r);
        byType.set(r.stepType, typeAcc);

        const flowId = r.flowDefinitionId ?? UNKNOWN_FLOW;
        const flowEntry = byFlow.get(flowId) ?? { total: newAccumulator(), types: new Map<string, Accumulator>() };
        accumulate(flowEntry.total, r);
        const flowTypeAcc = flowEntry.types.get(r.stepType) ?? newAccumulator();
        accumulate(flowTypeAcc, r);
        flowEntry.types.set(r.stepType, flowTypeAcc);
        byFlow.set(flowId, flowEntry);
    }

    const byStepType: StepTypeBucket[] = [...byType.entries()]
        .map(([stepType, acc]) => toStepTypeBucket(stepType, acc))
        .sort((a, b) => b.count - a.count);

    const byFlowResult: FlowStepBucket[] = [...byFlow.entries()]
        .map(([flowDefinitionId, entry]) => ({
            flowDefinitionId,
            count: entry.total.count,
            failCount: entry.total.failCount,
            byStepType: [...entry.types.entries()]
                .map(([stepType, acc]) => toStepTypeBucket(stepType, acc))
                .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.count - a.count);

    const totalSteps = records.length;
    return { totalSteps, byStepType, byFlow: byFlowResult };
};

/**
 * Builds a contiguous, gap-filled time series so the UI chart has no holes. `stepMs` is the
 * bucket width; buckets are aligned to it and span [from, now].
 */
const buildTimeSeries = (records: StepRecord[], from: Date, now: Date, stepMs: number): StepTimeBucket[] => {
    const counts = new Map<number, number>();
    for (const r of records) {
        const t = new Date(r.startTime).getTime();
        const bucket = Math.floor(t / stepMs) * stepMs;
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }

    const series: StepTimeBucket[] = [];
    const start = Math.floor(from.getTime() / stepMs) * stepMs;
    const end = now.getTime();
    for (let b = start; b <= end; b += stepMs) {
        series.push({ bucketStart: new Date(b).toISOString(), count: counts.get(b) ?? 0 });
    }
    return series;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Computes per-step statistics over the last 24 hours and last 7 days, plus per-hour and
 * per-day time series for spotting peaks. A single 7-day query feeds both windows.
 */
export const getStepStats = async (filters: StepStatsFilters = {}): Promise<StepStatsResponse> => {
    const now = new Date();
    const last24hFrom = subHours(now, 24);
    const last7dFrom = subDays(now, 7);

    // One query for the widest window; the 24h window is derived by filtering in-process.
    const allRecords = await queryStepRecordsByTime(last7dFrom.toISOString(), now.toISOString());

    const records7d = selectRecords(allRecords, filters, last7dFrom);
    const records24h = selectRecords(allRecords, filters, last24hFrom);

    return {
        ...(filters.stepType && { filterStepType: filters.stepType }),
        ...(filters.flowDefinitionId && { filterFlowDefinitionId: filters.flowDefinitionId }),
        last24Hours: buildRange(records24h),
        last7Days: buildRange(records7d),
        perHour: buildTimeSeries(records24h, last24hFrom, now, HOUR_MS),
        perDay: buildTimeSeries(records7d, last7dFrom, now, DAY_MS),
    };
};
