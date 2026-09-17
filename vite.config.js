import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      devOptions: {
              enabled: true
            },
      manifest: {
        name: 'MatchPet - Adopción Responsable',
        short_name: 'MatchPet',
        description: 'Encuentra a tu compañero ideal y adopta de forma responsable en Bolivia.',
        theme_color: '#4F46E5', 
        background_color: '#ffffff',
        display: 'standalone',
        scope: './',
        start_url: './',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' 
          }
        ]
      }
    })
  ]
})
