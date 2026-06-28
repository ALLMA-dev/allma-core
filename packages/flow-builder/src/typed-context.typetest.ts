/**
 * Compile-fail fixtures for the opt-in typed-context generic (RFC §11). This
 * file is type-checked by `tsconfig.typetest.json` (run from `typed-context.type.test.ts`),
 * NOT by the build or the type-cost guard. Each `@ts-expect-error` asserts that a
 * bad context path is a COMPILE error; if the type ever stops catching it, the
 * unused-directive error fails the type-test. It is never executed.
 */
import { flowContext } from './typed-context.js';

interface Ctx {
  steps_output: { summarize: { text: string }; counts: number[] };
  flow_variables: { bucket: string };
}

const $ = flowContext<Ctx>();

// --- Valid paths: these must compile cleanly. ---
$('$');
$('$.steps_output');
$('$.steps_output.summarize');
$('$.steps_output.summarize.text');
$('$.steps_output.counts');
$('$.flow_variables.bucket');
$.eq('$.steps_output.summarize.text', 'done');
$.gt('$.steps_output.counts', 0);

// --- Invalid paths: each must be a compile error. ---
// @ts-expect-error - typo in a leaf key
$('$.steps_output.summarize.txet');
// @ts-expect-error - unknown top-level key
$('$.nope');
// @ts-expect-error - missing the `$.` root
$('steps_output');
// @ts-expect-error - descending into an array leaf
$('$.steps_output.counts.length');
// @ts-expect-error - typo in a comparison path
$.eq('$.flow_variables.bouquet', 'x');

// Reference the bindings so `noUnusedLocals` (if enabled) stays satisfied.
export const _typetestMarker = $;
