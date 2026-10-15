import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': {
        target: 'https://brown-goldfish-546701.hostingersite.com',
        changeOrigin: true,
        secure: false,
      },
      '/sender': {
        target: 'https://brown-goldfish-546701.hostingersite.com',
        changeOrigin: true,
        secure: false,
      },
      '/banger': {
        target: 'https://brown-goldfish-546701.hostingersite.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
