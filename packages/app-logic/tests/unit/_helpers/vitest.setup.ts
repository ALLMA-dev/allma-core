import { expect } from 'vitest';
import * as awsMatchers from 'aws-sdk-client-mock-vitest';

/**
 * Quiet the structured logger by default. `@allma/core-sdk` reads LOG_LEVEL when its logger
 * module is first imported (which happens when a spec imports its SUT, i.e. after this setup
 * file runs), so setting it here keeps unit output readable. Tests that need to assert on log
 * output can still capture it via the `captureLogs` helper.
 */
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'CRITICAL';
}

/**
 * Global setup for the hermetic `unit` project. Registers the aws-sdk-client-mock matchers
 * (e.g. `toHaveReceivedCommandWith`) so every unit spec can assert on stubbed AWS calls.
 */
expect.extend(awsMatchers);
