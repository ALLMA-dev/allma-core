import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import {
    ENV_VAR_NAMES,
    ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
    DashboardStats,
    StatusBreakdown,
    TimeRangeStat,
    RecentExecutionSummary,
} from '@allma/core-types';
import { subDays, subHours } from 'date-fns';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FLOW_EXECUTION_LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const GSI_NAME = 'GSI_ByItemType_StartTime';

interface ExecutionRecord {
    flowExecutionId?: string;
    flowDefinitionId?: string;
    flowDefinitionVersion?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    errorInfo?: {
        errorName?: string;
    };
    [key: string]: unknown;
}

const queryExecutionsByTime = async (startTime: string, endTime: string): Promise<ExecutionRecord[]> => {
    let allItems: ExecutionRecord[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        const queryParams: QueryCommandInput = {
            TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: 'itemType = :itemType AND startTime BETWEEN :start AND :end',
            ExpressionAttributeValues: {
                ':itemType': ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
                ':start': startTime,
                ':end': endTime,
            },
            ExclusiveStartKey: lastEvaluatedKey,
        };

        const { Items, LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand(queryParams));
        if (Items) {
            allItems = allItems.concat(Items as ExecutionRecord[]);
        }
        lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
};

const calculateStats = (records: ExecutionRecord[]): TimeRangeStat => {
    const statusBreakdown: StatusBreakdown = { COMPLETED: 0, FAILED: 0, RUNNING: 0, TIMED_OUT: 0, CANCELLED: 0 };
    let totalDuration = 0;
    let completedCount = 0;

    for (const record of records) {
        if (record.status && Object.prototype.hasOwnProperty.call(statusBreakdown, record.status)) {
            statusBreakdown[record.status as keyof StatusBreakdown]++;
        }
        if (record.status === 'COMPLETED' && record.startTime && record.endTime) {
            const duration = new Date(record.endTime).getTime() - new Date(record.startTime).getTime();
            totalDuration += duration;
            completedCount++;
        }
    }

    return {
        totalExecutions: records.length,
        statusBreakdown,
        averageDurationMs: completedCount > 0 ? totalDuration / completedCount : 0,
    };
};

const getRecentFailures = async (): Promise<RecentExecutionSummary[]> => {
    const queryParams: QueryCommandInput = {
        TableName: FLOW_EXECUTION_LOG_TABLE_NAME,
        IndexName: GSI_NAME,
        KeyConditionExpression: 'itemType = :itemType',
        FilterExpression: '#status = :failedStatus',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':itemType': ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
            ':failedStatus': 'FAILED',
        },
        ScanIndexForward: false,
        Limit: 10,
    };

    const { Items } = await ddbDocClient.send(new QueryCommand(queryParams));
    return (Items || []).map((item) => ({
        flowExecutionId: item.flowExecutionId,
        flowDefinitionId: item.flowDefinitionId,
        flowDefinitionVersion: item.flowDefinitionVersion,
        startTime: item.startTime,
        errorName: item.errorInfo?.errorName || 'Unknown Error',
    }));
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const now = new Date();
    const endOfDay = now.toISOString();
    const startOfLast24h = subHours(now, 24).toISOString();
    const startOfLast7d = subDays(now, 7).toISOString();

    const [recordsLast24h, recordsLast7d, recentFailures] = await Promise.all([
        queryExecutionsByTime(startOfLast24h, endOfDay),
        queryExecutionsByTime(startOfLast7d, endOfDay),
        getRecentFailures(),
    ]);

    const statsLast24h = calculateStats(recordsLast24h);
    const statsLast7d = calculateStats(recordsLast7d);

    return {
        last24Hours: statsLast24h,
        last7Days: statsLast7d,
        recentFailures,
    };
};

export const DashboardStatsService = {
    getDashboardStats,
};
