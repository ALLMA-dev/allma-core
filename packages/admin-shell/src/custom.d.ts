// This file tells TypeScript that importing a .css file is a valid operation.
// It effectively treats the CSS file as a module with no exports, which is
// sufficient to prevent the TS6307 error during declaration file generation.
declare module '*.css';