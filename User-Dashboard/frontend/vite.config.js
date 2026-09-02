import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'GraveLocator — Calbayog Memorial Park',
        short_name: 'GraveLocator',
        description: 'Find and manage lots, plots, and memorials at Calbayog Memorial Park.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#863bff',
        background_color: '#863bff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML/images/fonts) is precached for offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Never let the service worker cache API/data responses — those must
        // always hit the network so lot/plot/memorial data stays fresh.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
