import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All calls to /extract go to backend at localhost:3000
      '/extract': 'http://localhost:3000',
    },
  }
})
