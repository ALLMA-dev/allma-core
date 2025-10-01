import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // The entry point of our package
  format: ['cjs', 'esm'],    // Output both CommonJS and ES Modules
  dts: true,                 // Generate TypeScript declaration files (.d.ts)
  splitting: false,
  sourcemap: true,
  clean: true,               // Clean the 'dist' directory before building
  // Add this banner to the top of all ESM files. This is crucial for
  // components to work correctly in modern React frameworks (like Next.js App Router).
  // It's a best practice for any new component library.
  banner: {
    js: "'use client'",
  },
});