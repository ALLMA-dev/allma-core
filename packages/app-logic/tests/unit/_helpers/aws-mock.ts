import { mockClient } from 'aws-sdk-client-mock';
import type { AwsClientStub } from 'aws-sdk-client-mock';
import type { MetadataBearer } from '@smithy/types';
import type { Client } from '@smithy/smithy-client';

/**
 * Thin conveniences over aws-sdk-client-mock. AWS SDK clients in `src/` are module-scope
 * singletons constructed at import time, so we intercept at the `send` layer with
 * `mockClient(...)` rather than injecting clients. Vitest's `clearMocks` does NOT reset these
 * stubs (they are not vi mocks), so reset them explicitly between tests.
 */
export { mockClient };

/**
 * Reset a set of client stubs. Call from `beforeEach` so command history and queued
 * behaviours never leak across tests.
 */
export const resetAwsClientMocks = (
  ...mocks: Array<AwsClientStub<Client<any, any, any, any>>>
): void => {
  for (const m of mocks) {
    m.reset();
  }
};

export type { AwsClientStub, MetadataBearer };
