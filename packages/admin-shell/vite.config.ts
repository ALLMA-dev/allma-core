// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => { // Access mode here
  return {
    plugins: [react()],
    // Add the define block here
    define: {
      // This makes 'process.env.NODE_ENV' available and Vite will replace it
      // with the current mode ('development', 'production', etc.)
      'process.env.NODE_ENV': JSON.stringify(mode),

      // If Amplify or another lib specifically needs `global.process.env.NODE_ENV`
      // you might need this too, though usually the above is enough.
      // 'global.process.env.NODE_ENV': JSON.stringify(mode),

      // If other specific 'process.env' variables are needed by Amplify
      // (less common for just the logger), you can define them too.
      // e.g., 'process.env.SOME_AMPLIFY_CONFIG': JSON.stringify('some_value')
    },
    server: {
      // Add this watch configuration to ensure the dev server restarts
      // when you make changes to files within your local packages.
      watch: {
        ignored: [
          path.resolve(__dirname, 'node_modules'),
        ],
        // Explicitly watch the local packages for changes
        paths: [
          path.resolve(__dirname, '../allma-types/src'),
          path.resolve(__dirname, '../allma-qa-types/src'),
          path.resolve(__dirname, '../allma-qa-admin-ui/src'),
          path.resolve(__dirname, '../allma-data-ingestion/admin-ui/src'),
          path.resolve(__dirname, '../symanty-core/symanty-core-admin-ui/src'),
          path.resolve(__dirname, '../symanty-compliance-checker/types/src'),
          path.resolve(__dirname, '../symanty-compliance-checker/admin-ui/src'), 
          path.resolve(__dirname, '../chat-bot-admin-ui/src'),
        ]
      },
    },
    // This setting ensures Vite's dependency optimizer scans your local packages
    // for dependencies, which is crucial in a monorepo setup.
    optimizeDeps: {
      include: ['@symanty/core-admin-ui', '@symanty/compliance-checker-admin-ui', '@symanty/chat-bot-admin-ui', '@allma/qa-admin-ui', '@allma/data-ingestion-admin-ui'],
    },
  };
});