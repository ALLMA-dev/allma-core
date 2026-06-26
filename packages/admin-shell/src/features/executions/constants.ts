// packages/allma-admin-shell/src/features/executions/constants.ts

export const EXECUTIONS_LIST_QUERY_KEY = 'flowExecutions';
export const EXECUTION_DETAIL_QUERY_KEY = 'flowExecutionDetail';
export const EXECUTION_PROGRESS_QUERY_KEY = 'flowExecutionProgress';
export const BRANCH_STEPS_QUERY_KEY = 'flowExecutionBranchSteps';

// How often (ms) to poll live execution progress while an execution is still running.
export const EXECUTION_PROGRESS_POLL_INTERVAL_MS = 3000;