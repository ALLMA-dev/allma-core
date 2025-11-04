import { defineConfig } from 'tsup';
import { peerDependencies, dependencies } from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Externalize peerDependencies and dependencies.
  // This is crucial for a library package to avoid bundling code
  // that the consuming application will provide.
  external: [...Object.keys(peerDependencies), ...Object.keys(dependencies)],
  banner: {
    js: "'use client'",
  },
  // Use a dedicated tsconfig for building, which doesn't have `noEmit: true`.
  tsconfig: 'tsconfig.build.json',
});