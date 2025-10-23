import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import {
  FlowRuntimeState,
  StepDefinition,
  StepHandler,
  TransientStepError,
  isS3OutputPointerWrapper,
  ENV_VAR_NAMES
} from '@allma/core-types';
import { log_error, log_info, offloadIfLarge } from '@allma/core-sdk';
import { z } from 'zod';
import { TemplateService } from '../template-service.js';

const lambdaClient = new LambdaClient({});

// Get the bucket name from environment variables
const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME];

// MODIFIED: Zod schema now includes the optional customConfig for hydration control.
const CustomLambdaInvokeStepSchema = z.object({
  stepType: z.literal('CUSTOM_LAMBDA_INVOKE'),
  lambdaFunctionArnTemplate: z.string(),
  moduleIdentifier: z.string().optional(),
  payloadTemplate: z.record(z.string()).optional(),
  customConfig: z.object({
    hydrateInputFromS3: z.boolean().optional(),
  }).passthrough().optional(),
});

export const handleCustomLambdaInvoke: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState
) => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = CustomLambdaInvokeStepSchema.safeParse(stepDefinition);

  if (!parsedStepDef.success) {
    throw new Error(`Invalid StepDefinition for CUSTOM_LAMBDA_INVOKE: ${parsedStepDef.error.message}`);
  }

  // Check if the bucket name is configured for offloading.
  if (!EXECUTION_TRACES_BUCKET_NAME) {
    log_error("ALLMA_EXECUTION_TRACES_BUCKET_NAME env var not set. Cannot offload large payloads from custom lambda.", {}, correlationId);
    // This is a critical configuration error. We should fail the step.
    throw new Error("Execution traces bucket is not configured; cannot proceed with custom lambda invocation.");
  }

  const { lambdaFunctionArnTemplate, moduleIdentifier } = parsedStepDef.data;

  // Render the ARN from the template
  const templateService = TemplateService.getInstance();
  const lambdaArn = templateService.render(lambdaFunctionArnTemplate, runtimeState.currentContextData);
  
  // Prepare the payload for the target Lambda
  const payloadForTargetLambda = {
    moduleIdentifier,
    stepInput, // Pass the entire prepared step input
    correlationId,
  };

  log_info(`Invoking custom logic Lambda`, { lambdaArn, moduleIdentifier }, correlationId);

  try {
    const command = new InvokeCommand({
      FunctionName: lambdaArn,
      Payload: JSON.stringify(payloadForTargetLambda),
      InvocationType: InvocationType.RequestResponse, // Synchronous invocation
    });
    
    const result = await lambdaClient.send(command);

    if (result.FunctionError) {
      const errorPayload = result.Payload ? new TextDecoder().decode(result.Payload) : '{}';
      log_error(`Custom logic Lambda returned an error`, { errorPayload }, correlationId);
      throw new Error(`Custom logic Lambda failed: ${errorPayload}`);
    }

    const responsePayload = result.Payload ? JSON.parse(new TextDecoder().decode(result.Payload)) : null;

    // --- NEW: Payload Offloading Logic ---
    // The invoked lambda might have already offloaded a very large payload. 
    // If so, responsePayload will be an S3OutputPointerWrapper. We don't want to wrap a wrapper.
    if (isS3OutputPointerWrapper(responsePayload)) {
        log_info('Invoked custom lambda returned a pre-offloaded S3 pointer. Passing it through.', { s3Pointer: responsePayload._s3_output_pointer }, correlationId);
        return {
            outputData: responsePayload,
        };
    }

    // If the payload is not already a pointer, check if it's large and offload it
    // to protect the Step Function state limit (256KB). offloadIfLarge uses a safe threshold.
    const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${stepDefinition.id}`;
    const finalPayloadForSfn = await offloadIfLarge(
        responsePayload,
        EXECUTION_TRACES_BUCKET_NAME,
        s3KeyPrefix,
        correlationId
    );
    // --- END: Offloading Logic ---

    return {
      outputData: finalPayloadForSfn
    };
    
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException' || error.name === 'InvalidRequestContentException') {
      throw error; // Fail fast for configuration errors
    }
    // Assume other errors could be transient
    throw new TransientStepError(`Failed to invoke custom logic Lambda '${lambdaArn}': ${error.message}`);
  }
};