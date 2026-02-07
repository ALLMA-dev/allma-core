import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@smithy/util-utf8': '@aws-sdk/util-utf8-browser',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api-beta.optiroq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
    // Add watch configuration for monorepo development if needed
    watch: {
      // ignored: [path.resolve(__dirname, 'node_modules')],
    },
  },
});