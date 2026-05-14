import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BACKEND_URL defaults to Docker service name. For local dev without Docker, set to http://localhost:8000
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
