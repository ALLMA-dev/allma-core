import { expect } from 'vitest';
import * as awsMatchers from 'aws-sdk-client-mock-vitest';

/**
 * Global setup for the hermetic `unit` project. Registers the aws-sdk-client-mock matchers
 * (e.g. `toHaveReceivedCommandWith`) so every unit spec can assert on stubbed AWS calls.
 */
expect.extend(awsMatchers);
