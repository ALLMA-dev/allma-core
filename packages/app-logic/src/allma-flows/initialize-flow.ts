import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  FlowRuntimeState,
  FlowRuntimeStateSchema,
  StartFlowExecutionInputSchema,
  type StartFlowExecutionInput,
  S3Pointer,
  isS3Pointer,
  ProcessorOutput,
  SfnActionType,
} from '@allma/core-types';
import {
  log_debug,
  log_error,
  log_info,
  resolveS3Pointer,
} from '@allma/core-sdk';
import { loadFlowDefinition } from '../allma-core/config-loader.js';
import { executionLoggerClient } from '../allma-core/execution-logger-client.js';


/**
 * AWS Lambda handler for the "InitializeFlowExecution" state.
 * This is the entry point for a new ALLMA flow execution.
 *
 * Responsibilities:
 * 1. Validates the input payload from the trigger (e.g., SQS, API Gateway).
 * 2. Generates a unique `flowExecutionId`.
 * 3. Loads the specified `FlowDefinition` from the config table.
 * 4. Constructs and validates the initial `FlowRuntimeState` object.
 * 5. Returns the initial state wrapped in a ProcessorOutput object to the Step Functions orchestrator.
 */
export const handler: Handler<StartFlowExecutionInput, ProcessorOutput> = async (event) => {
    const correlationId = event.executionOverrides?.startFromState?.flowExecutionId || event.flowExecutionId || uuidv4();
    
    log_info('InitializeFlowLambda invoked', { }, correlationId);
    log_debug('Initial event:', { event }, correlationId);

  try {
    // --- Handle Stateful Redrive Override ---
    // If a complete state is provided, bypass normal initialization and use it directly.
    if (event.executionOverrides?.startFromState) {
        log_info('Stateful redrive detected. Initializing from provided state.', {
            startFromStep: event.executionOverrides.startFromState.currentStepInstanceId
        }, correlationId);

        const startState = FlowRuntimeStateSchema.parse(event.executionOverrides.startFromState);

        // We must still log the start of this new execution
        if (startState.enableExecutionLogs) {
             await executionLoggerClient.createMetadataRecord({
                flowExecutionId: startState.flowExecutionId,
                flowDefinitionId: startState.flowDefinitionId,
                flowDefinitionVersion: startState.flowDefinitionVersion,
                startTime: startState.startTime,
                initialInputPayload: event, // Log the original StartFlowExecutionInput for traceability
                triggerSource: event.triggerSource,
                enableExecutionLogs: startState.enableExecutionLogs,
            });
        }
        
        return {
            runtimeState: startState,
            sfnAction: SfnActionType.PROCESS_STEP,
        };
    }
    // --- END: Stateful Redrive Override ---

    // 1. Validate input
    const startInputParseResult = StartFlowExecutionInputSchema.safeParse(event);
    if (!startInputParseResult.success) {
        log_error('Invalid StartFlowExecutionInput received.', { errors: startInputParseResult.error.flatten()}, correlationId);
        throw new Error('Invalid StartFlowExecutionInput: ' + startInputParseResult.error.message);
    }
    const startInput = startInputParseResult.data;

    // Use provided or generated flowExecutionId
    const effectiveFlowExecutionId = startInput.flowExecutionId || correlationId;

    // 2. Load the FlowDefinition
    const flowDefinition = await loadFlowDefinition(
      startInput.flowDefinitionId,
      startInput.flowVersion,
      effectiveFlowExecutionId
    );

    // 3. Resolve initial context data, which may have been offloaded to S3 by the calling service.
    let initialContextData = startInput.initialContextData || {};
    // Upstream services (like allma-flow-starter) may offload the context and place a pointer here.
    // We check for the conventional '_s3_context_pointer' key.
    const s3Pointer = (initialContextData as any)._s3_context_pointer as S3Pointer | undefined;

    if (s3Pointer && isS3Pointer(s3Pointer)) {
        log_info(`Initial context data is an S3 pointer. Resolving...`, { bucket: s3Pointer.bucket, key: s3Pointer.key }, correlationId);
        // Use the standardized S3 utility to fetch the actual context data
        initialContextData = await resolveS3Pointer(s3Pointer, correlationId);
    }

    // Determine if logging is enabled for this specific run
    const enableLogs = startInput.enableExecutionLogs ?? flowDefinition.enableExecutionLogs ?? false;

    // 4. Construct initial FlowRuntimeState
    const startTime = new Date().toISOString();
    
    // Inject system-provided values into the context.
    // This makes flowExecutionId and executionOverrides available from the first step.
    const initialContextWithSystemValues = {
        steps_output: {}, // Ensure standard keys always exist
        flow_variables: {
          flowExecutionId: effectiveFlowExecutionId
        },
        ...initialContextData,
        // Merge executionOverrides into the flow's context so it can be accessed via JSONPath
        ...(startInput.executionOverrides && { executionOverrides: startInput.executionOverrides })
    };

    const initialState: FlowRuntimeState = {
      flowDefinitionId: flowDefinition.id,
      flowDefinitionVersion: flowDefinition.version,
      flowExecutionId: effectiveFlowExecutionId,
      enableExecutionLogs: enableLogs,
      currentStepInstanceId: flowDefinition.startStepInstanceId,
      status: 'RUNNING',
      startTime: startTime,
      currentContextData: initialContextWithSystemValues,
      stepRetryAttempts: {},
      _internal: {
        // Store original input for "log on fail" bootstrapping
        originalStartInput: startInput,
        loggingBootstrapped: false,
      },
      // Carry over execution overrides from the start input to the runtime state.
      executionOverrides: startInput.executionOverrides,
    };
    
    // 5. Asynchronously log the main flow execution record using the client, if enabled
    if (initialState.enableExecutionLogs) {
        await executionLoggerClient.createMetadataRecord({
            flowExecutionId: effectiveFlowExecutionId,
            flowDefinitionId: flowDefinition.id,
            flowDefinitionVersion: flowDefinition.version,
            startTime: startTime,
            initialInputPayload: startInput,
            triggerSource: startInput.triggerSource,
            enableExecutionLogs: initialState.enableExecutionLogs,
        });
        initialState._internal!.loggingBootstrapped = true; // Mark that the metadata record was created
        log_info('Main flow execution record queued for logging.', { flowExecutionId: effectiveFlowExecutionId }, correlationId);
    }

    // 6. Validate the initial state for SFN
    const validatedState = FlowRuntimeStateSchema.parse(initialState);
    log_info(`Flow execution initialized successfully for flowDefinitionId '${flowDefinition.id}'`, { flowExecutionId: effectiveFlowExecutionId }, correlationId);

    // 7. Return the state wrapped in a ProcessorOutput object
    const output: ProcessorOutput = {
      runtimeState: validatedState,
      sfnAction: SfnActionType.PROCESS_STEP, // The next action is to process the first step.
    };

    return output;

} catch (error: any) {
    log_error('Failed to initialize flow execution', { error: error.message, stack: error.stack }, correlationId);
    // Let the SFN top-level catch handler route this to the FinalizeFlow lambda,
    // which will log the FAILED status correctly.
    throw error; // Propagate error to SFN
  }
};
