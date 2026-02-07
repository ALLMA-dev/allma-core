import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => { 
  return {
  plugins: [react()],
  define: {
      // This makes 'process.env.NODE_ENV' available and Vite will replace it
      // with the current mode ('development', 'production', etc.)
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
}});
