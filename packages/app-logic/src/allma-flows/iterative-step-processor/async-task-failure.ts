import { ProcessorInput } from '@allma/core-types';

type AsyncTaskFailure = NonNullable<ProcessorInput['asyncTaskFailure']>;

export class AsyncTaskFailureError extends Error {
    readonly details: Record<string, unknown>;

    constructor(name: string, message: string, details: Record<string, unknown>) {
        super(message);
        this.name = name;
        this.details = details;
    }
}

const parseJsonObject = (value: string | undefined): Record<string, any> | undefined => {
    if (!value || !value.trimStart().startsWith('{')) return undefined;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Converts the Step Functions catch output of a wait, polling or sync sub-flow task into the error
 * the failed step reports. For a `.sync` sub-execution the Cause is the child's DescribeExecution
 * result, so the child's own error name, message and execution ARN are kept.
 */
export const toAsyncTaskFailureError = (failure: AsyncTaskFailure): AsyncTaskFailureError => {
    const taskError = failure.Error || 'AsyncTaskFailed';
    const cause = parseJsonObject(failure.Cause);
    const details: Record<string, unknown> = { taskError };

    if (!cause) {
        return new AsyncTaskFailureError(taskError, failure.Cause || `Async task failed with ${taskError}.`, details);
    }

    if (typeof cause.ExecutionArn === 'string') {
        details.childExecutionArn = cause.ExecutionArn;
        if (cause.Status) details.childExecutionStatus = cause.Status;
        const name = cause.Error || taskError;
        const message = cause.Cause || `Sub-flow execution ended with status ${cause.Status ?? 'unknown'}.`;
        return new AsyncTaskFailureError(name, message, details);
    }

    const name = cause.errorName ?? cause.errorType ?? cause.error ?? cause.Error ?? taskError;
    const message = cause.errorMessage ?? cause.cause ?? cause.Cause ?? failure.Cause!;
    return new AsyncTaskFailureError(name, message, details);
};
