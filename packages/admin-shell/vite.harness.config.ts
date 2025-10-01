import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// This is a separate Vite config specifically for running the plugin development harness.
// It overrides the entry point to use the harness/index.tsx file.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: __dirname,
  build: {
    outDir: './dist-harness',
    // This is the key change: override the default entry point
    // by specifying a custom rollup input
    rollupOptions: {
      input: '/src/harness/index.html',
    },
  },
  server: {
    port: 3001, // Run harness on a different port to avoid conflicts
  },
  // Point to the harness entry file
  publicDir: 'public',
  define: {
    'process.env': process.env
  },
  // This is the key change: override the default entry point
  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
});
