import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
    type AllmaFlowExecutionRecord,
    type AllmaError,
    ENV_VAR_NAMES,
    METADATA_SK_VALUE,
} from '@allma/core-types';
import { log_info, log_warn, log_error } from '@allma/core-sdk';
import { buildExecutionEvent, emitLifecycleEvent } from '../allma-core/notifications/execution-notifier.js';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const LOG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]!;
const STATUS_TOPIC_ARN = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_STATUS_TOPIC_ARN];

/** SFN execution status → Allma flow terminal status. */
const STATUS_MAP: Record<string, AllmaFlowExecutionRecord['status']> = {
    SUCCEEDED: 'COMPLETED',
    FAILED: 'FAILED',
    TIMED_OUT: 'TIMED_OUT',
    ABORTED: 'CANCELLED',
};

const NON_TERMINAL = ['INITIALIZING', 'RUNNING'];

interface SfnStatusChangeDetail {
    executionArn?: string;
    stateMachineArn?: string;
    status?: string;
    stopDate?: number;
    error?: string;
    cause?: string;
}

/**
 * Because the SFN execution name is the `flowExecutionId`, the execution ARN
 * (`...:execution:<stateMachine>:<flowExecutionId>`) yields the id directly.
 */
function flowExecutionIdFromArn(executionArn: string): string | undefined {
    const parts = executionArn.split(':');
    return parts.length >= 8 ? parts[parts.length - 1] : undefined;
}

function buildErrorInfo(detail: SfnStatusChangeDetail, sfnStatus: string): AllmaError | undefined {
    if (sfnStatus === 'SUCCEEDED') return undefined;
    let errorMessage = detail.cause || `Execution ended with status ${sfnStatus}.`;
    // SFN often packs a JSON Cause; surface its message when present.
    if (detail.cause && detail.cause.startsWith('{')) {
        try {
            const parsed = JSON.parse(detail.cause);
            errorMessage = parsed.errorMessage || parsed.Cause || parsed.cause || errorMessage;
        } catch {
            /* keep raw cause */
        }
    }
    return { errorName: detail.error || sfnStatus, errorMessage, isRetryable: false };
}

/**
 * Crash-safe terminal pipeline (Pillar C, §7.3). Subscribed to SFN Execution Status Change events
 * (SUCCEEDED|FAILED|TIMED_OUT|ABORTED) for the orchestrator state machine, it:
 *  1. reconciles the metadata record if it is still RUNNING/INITIALIZING (repairs "zombie RUNNING"
 *     left by hard crashes that skipped finalize-flow);
 *  2. delivers a TERMINAL event to the caller's per-trigger sinks (signed webhook / SNS / SQS); and
 *  3. publishes the TERMINAL event to the status topic.
 *
 * TERMINAL is emitted ONLY here (never by finalize-flow), so a normal completion delivers exactly
 * one TERMINAL and the crash path is always covered. A thrown error propagates so EventBridge's
 * async retry + the Lambda DLQ provide the delivery backstop.
 */
export const handler: Handler<{ detail?: SfnStatusChangeDetail }, void> = async (event) => {
    const detail = event.detail ?? {};
    const sfnStatus = detail.status ?? '';
    const terminalStatus = STATUS_MAP[sfnStatus];

    if (!detail.executionArn || !terminalStatus) {
        log_warn('Ignoring SFN status-change event with no mappable terminal status.', { status: sfnStatus }, 'dispatcher');
        return;
    }

    const flowExecutionId = flowExecutionIdFromArn(detail.executionArn);
    if (!flowExecutionId) {
        log_warn('Could not derive flowExecutionId from execution ARN.', { executionArn: detail.executionArn }, 'dispatcher');
        return;
    }
    const correlationId = flowExecutionId;

    // Only flow executions carry a METADATA record; branch / polling sub-executions do not, so a
    // miss here is an expected no-op rather than an error.
    const { Item } = await ddbDocClient.send(new GetCommand({
        TableName: LOG_TABLE_NAME,
        Key: { flowExecutionId, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE },
    }));
    const metadata = Item as AllmaFlowExecutionRecord | undefined;
    if (!metadata) {
        log_info('No metadata record for this execution; nothing to reconcile or notify.', { flowExecutionId, sfnStatus }, correlationId);
        return;
    }

    const endTime = detail.stopDate ? new Date(detail.stopDate).toISOString() : new Date().toISOString();
    const errorInfo = buildErrorInfo(detail, sfnStatus);

    // 1. Reconcile — only if the record was left non-terminal (i.e. a crash skipped finalize-flow).
    if (NON_TERMINAL.includes(metadata.status)) {
        try {
            await ddbDocClient.send(new UpdateCommand({
                TableName: LOG_TABLE_NAME,
                Key: { flowExecutionId, eventTimestamp_stepInstanceId_attempt: METADATA_SK_VALUE },
                UpdateExpression: 'SET #status = :status, #overallStatus = :status, #endTime = :endTime, #flowSortKey = :flowSortKey' + (errorInfo ? ', #errorInfo = :errorInfo' : ''),
                ConditionExpression: '#status = :running OR #status = :init',
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#overallStatus': 'overallStatus',
                    '#endTime': 'endTime',
                    '#flowSortKey': 'flow_sort_key',
                    ...(errorInfo && { '#errorInfo': 'errorInfo' }),
                },
                ExpressionAttributeValues: {
                    ':status': terminalStatus,
                    ':endTime': endTime,
                    ':flowSortKey': `v#${metadata.flowDefinitionVersion}#s#${terminalStatus}#t#${metadata.startTime}`,
                    ':running': 'RUNNING',
                    ':init': 'INITIALIZING',
                    ...(errorInfo && { ':errorInfo': errorInfo }),
                },
            }));
            log_warn('Reconciled a non-terminal execution to its real terminal status (crash repair).', { flowExecutionId, terminalStatus }, correlationId);
        } catch (e: any) {
            if (e.name === 'ConditionalCheckFailedException') {
                log_info('Execution already terminal (finalize-flow won the race); skipping reconcile write.', { flowExecutionId }, correlationId);
            } else {
                throw e;
            }
        }
    }

    // 2 + 3. Notify the caller's sinks (TERMINAL only, per its config) and publish to the topic.
    const headlineLabel = metadata.currentCheckpoint?.label ?? metadata.currentStepDisplayName ?? (terminalStatus === 'COMPLETED' ? 'Completed' : terminalStatus);
    const statusEvent = buildExecutionEvent({
        eventType: 'TERMINAL',
        rootFlowExecutionId: metadata.rootFlowExecutionId ?? flowExecutionId,
        flowExecutionId,
        flowDefinitionId: metadata.flowDefinitionId,
        flowDefinitionVersion: metadata.flowDefinitionVersion,
        status: terminalStatus,
        depth: metadata.depth,
        checkpoint: metadata.currentCheckpoint,
        progressPercent: terminalStatus === 'COMPLETED' ? 100 : metadata.progressPercent,
        headlineLabel,
        correlationKey: metadata.notificationConfig?.correlationKey,
        errorInfo: errorInfo ?? metadata.errorInfo,
        occurredAt: endTime,
    });

    const failures = await emitLifecycleEvent({
        event: statusEvent,
        notificationConfig: metadata.notificationConfig,
        topicArn: STATUS_TOPIC_ARN,
        correlationId,
    });

    // Surface per-trigger delivery failure so EventBridge retry + the Lambda DLQ can back it up.
    if (failures > 0) {
        throw new Error(`Failed to deliver TERMINAL event to ${failures} caller sink(s) for ${flowExecutionId}.`);
    }

    log_info('Processed terminal lifecycle event.', { flowExecutionId, terminalStatus }, correlationId);
};
