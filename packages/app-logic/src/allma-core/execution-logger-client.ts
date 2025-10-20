import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    ENV_VAR_NAMES,
    ExecutionLoggerPayload,
    S3Pointer,
    AllmaFlowExecutionRecord,
    type LogStepExecutionRecord,
    type MinimalLogStepExecutionRecord,
} from '@allma/core-types';
import { log_error, log_debug } from '@allma/core-sdk';

const lambdaClient = new LambdaClient({});
const s3Client = new S3Client({});

const EXECUTION_LOGGER_LAMBDA_ARN = process.env.EXECUTION_LOGGER_LAMBDA_ARN!;
const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;
const LAMBDA_PAYLOAD_LIMIT_BYTES = 240 * 1024;

class ExecutionLoggerClient {
    private async invokeLogger(payload: ExecutionLoggerPayload, correlationId: string): Promise<void> {
        if (!EXECUTION_LOGGER_LAMBDA_ARN) {
            log_error('EXECUTION_LOGGER_LAMBDA_ARN is not configured. Cannot log execution event.', { action: payload.action }, correlationId);
            return;
        }

        try {
            const finalPayloadString = JSON.stringify(payload);
            const finalPayloadSize = Buffer.byteLength(finalPayloadString, 'utf-8');

            if (finalPayloadSize > LAMBDA_PAYLOAD_LIMIT_BYTES) {
                log_error(
                    'Minimal ExecutionLogger payload exceeds size limit. This should not happen. Event will be dropped.',
                    {
                        error: `${finalPayloadSize} byte payload is too large for the Event invocation type (limit ${LAMBDA_PAYLOAD_LIMIT_BYTES} bytes)`,
                        action: payload.action,
                    },
                    correlationId
                );
                return;
            }

            await lambdaClient.send(new InvokeCommand({
                FunctionName: EXECUTION_LOGGER_LAMBDA_ARN,
                Payload: finalPayloadString,
                InvocationType: 'Event', // Fire-and-forget
            }));
        } catch (e: any) {
            log_error('Failed to invoke ExecutionLogger Lambda.', { error: e.message, action: payload.action }, correlationId);
        }
    }

    public async createMetadataRecord(
        record: Pick<AllmaFlowExecutionRecord, 'flowExecutionId' | 'flowDefinitionId' | 'flowDefinitionVersion' | 'startTime' | 'initialInputPayload' | 'triggerSource' | 'enableExecutionLogs'>
    ): Promise<void> {
        const payload: ExecutionLoggerPayload = {
            action: 'CREATE_METADATA',
            record,
        };
        await this.invokeLogger(payload, record.flowExecutionId);
    }

    public async updateFinalStatus(
        updateData: Omit<ExecutionLoggerPayload & { action: 'UPDATE_FINAL_STATUS' }, 'action'>
    ): Promise<void> {
        const payload: ExecutionLoggerPayload = {
            action: 'UPDATE_FINAL_STATUS',
            ...updateData,
        };
        await this.invokeLogger(payload, updateData.flowExecutionId);
    }

    public async logStepExecution(
        fullRecordData: LogStepExecutionRecord
    ): Promise<void> {
        const correlationId = fullRecordData.flowExecutionId;
        const s3Identifier = `${fullRecordData.stepInstanceId}_${fullRecordData.attemptNumber || 1}`;
        log_debug(`[execution-logger-client] Logging step execution for '${fullRecordData.stepInstanceId}' using hybrid storage model.`, {}, correlationId);

        try {
            // Step 1: ALWAYS upload the full, detailed record to S3.
            const fullRecordString = JSON.stringify(fullRecordData);
            const s3Key = `full_step_records/${correlationId}/${s3Identifier}_${new Date().toISOString()}.json`;
            
            await s3Client.send(new PutObjectCommand({
                Bucket: EXECUTION_TRACES_BUCKET_NAME,
                Key: s3Key,
                Body: fullRecordString,
                ContentType: 'application/json',
            }));

            const s3Pointer: S3Pointer = { bucket: EXECUTION_TRACES_BUCKET_NAME, key: s3Key };
            
            // Step 2: Construct the minimal record for DynamoDB.
            const minimalRecordForDb: MinimalLogStepExecutionRecord = {
                flowExecutionId: fullRecordData.flowExecutionId,
                branchId: fullRecordData.branchId,
                branchExecutionId: fullRecordData.branchExecutionId,
                eventTimestamp: fullRecordData.eventTimestamp,
                stepInstanceId: fullRecordData.stepInstanceId,
                stepDefinitionId: fullRecordData.stepDefinitionId,
                stepDefinitionVersion: fullRecordData.stepDefinitionVersion,
                stepType: fullRecordData.stepType,
                status: fullRecordData.status,
                startTime: fullRecordData.startTime,
                endTime: fullRecordData.endTime,
                durationMs: fullRecordData.durationMs,
                attemptNumber: fullRecordData.attemptNumber,
                ...(fullRecordData.errorInfo && { 
                    errorInfoSummary: {
                        errorName: fullRecordData.errorInfo.errorName,
                        errorMessage: fullRecordData.errorInfo.errorMessage,
                    }
                }),
                fullRecordS3Pointer: s3Pointer,
            };

            // Step 3: Create the payload for the logger Lambda. This payload is now always small.
            const payload: ExecutionLoggerPayload = {
                action: 'LOG_STEP_EXECUTION',
                record: minimalRecordForDb,
            };

            // Step 4: Invoke the logger.
            await this.invokeLogger(payload, correlationId);

        } catch (e: any) {
             log_error(`[execution-logger-client] Failed during S3 upload or payload construction for step '${s3Identifier}'`, { error: e.message }, correlationId);
        }
    }
}

export const executionLoggerClient = new ExecutionLoggerClient();
