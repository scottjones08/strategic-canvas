import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    host: true
  }
})
// Build 1769446572
// Build trigger Mon Jan 26 16:22:23 EST 2026
