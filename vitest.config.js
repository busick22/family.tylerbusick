// Component tests only. The pure-function suites still run under `node --test`
// (npm test); this config drives the ones that need a DOM.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.jsx'],
    css: false,
  },
})
