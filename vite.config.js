import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const capacitorBuild = process.env.CAPACITOR_BUILD === '1'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so images/scripts load correctly in the Capacitor WebView (Play Store builds).
  base: './',
  resolve: {
    alias: {
      'capacitor-native-shell': capacitorBuild
        ? path.resolve(__dirname, 'src/capacitor/initNativeShell.native.js')
        : path.resolve(__dirname, 'src/capacitor/initNativeShell.web.js'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // Service worker + Workbox breaks or caches wrong URLs in the Android WebView — skip for store builds.
    ...(capacitorBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['logo.png'],
            manifest: {
              name: 'Green Vision Trader',
              short_name: 'GV Trader',
              start_url: '/',
              display: 'standalone',
              background_color: '#000000',
              theme_color: '#34C759',
              icons: [
                {
                  src: '/logo-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: '/logo-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
                {
                  src: '/logo-512-maskable.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
          }),
        ]),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://admin.brightgemr1.com',
        changeOrigin: true,
      },
    },
  },
})
