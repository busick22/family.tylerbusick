import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Split the bundle so the browser can cache big, rarely-changing pieces
// (React, Firebase) separately from app code that changes every deploy.
function manualChunks(id) {
  if (!id.includes('node_modules')) return

  if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
    return 'react-vendor'
  }
  if (id.includes('node_modules/react-router')) {
    return 'router'
  }
  if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
    if (id.includes('/firestore')) return 'firebase-firestore'
    if (id.includes('/auth')) return 'firebase-auth'
    return 'firebase-core'
  }
  if (id.includes('node_modules/lucide-react/')) {
    return 'icons'
  }
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Busick Family',
        short_name: 'Busick',
        description: 'Family planning, meals, tasks & chores.',
        theme_color: '#FBF6F1',
        background_color: '#FBF6F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf}'],
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5175,
    host: true,
  },
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
})
