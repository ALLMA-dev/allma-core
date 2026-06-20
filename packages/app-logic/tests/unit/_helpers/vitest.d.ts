import 'vitest';
import type { CustomMatcher } from 'aws-sdk-client-mock-vitest';

/**
 * Type augmentation so the aws-sdk-client-mock matchers registered in vitest.setup.ts are
 * visible to TypeScript/editors. (Test files are not type-checked by the build, but this
 * keeps authoring ergonomic.)
 */
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatcher<T> {}
  interface AsymmetricMatchersContaining extends CustomMatcher {}
}
