import { offloadIfLarge } from '@allma/core-sdk';
import { isS3OutputPointerWrapper } from '@allma/core-types';

/**
 * Top-level `currentContextData` keys that are copied out alongside the S3 pointer when a flow
 * context is offloaded, so downstream stages can read them WITHOUT hydrating the (potentially huge)
 * offloaded blob.
 *
 * Currently just the system-level resume key: FinalizeFlow uses it to decide whether it must
 * materialize the whole context in memory. Being able to answer that from the small pointer wrapper
 * — rather than downloading the blob just to check — is what lets FinalizeFlow avoid holding a large
 * context in RAM and thus avoid `Runtime.OutOfMemory` on large (e.g. sub-flow) returns.
 */
export const STICKY_CONTEXT_MARKER_KEYS = ['_flow_resume_key'] as const;

/**
 * Offloads a flow's `currentContextData` to S3 when it exceeds `thresholdBytes`, returning either the
 * original object (when small enough to stay inline) or a pointer wrapper of the shape
 * `{ _s3_context_pointer, ...stickyMarkers }`.
 *
 * This is the single place the orchestrator converts a large in-flight context into a pointer, so it
 * also carries the {@link STICKY_CONTEXT_MARKER_KEYS} forward. Behaviour is otherwise identical to
 * the inline `offloadIfLarge` + wrapper construction it replaces.
 */
export async function offloadFlowContextIfLarge(
  currentContextData: Record<string, any>,
  bucketName: string,
  keyPrefix: string,
  correlationId: string,
  thresholdBytes: number,
): Promise<Record<string, any>> {
  const offloaded = await offloadIfLarge(currentContextData, bucketName, keyPrefix, correlationId, thresholdBytes);

  if (offloaded && isS3OutputPointerWrapper(offloaded)) {
    const wrapper: Record<string, any> = { _s3_context_pointer: offloaded._s3_output_pointer };
    for (const key of STICKY_CONTEXT_MARKER_KEYS) {
      const value = currentContextData?.[key];
      if (value !== undefined) {
        wrapper[key] = value;
      }
    }
    return wrapper;
  }

  // Small enough to stay inline — offloadIfLarge returned the original object unchanged.
  return offloaded as Record<string, any>;
}
