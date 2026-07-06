import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/lotm-tcg/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['battlefields/*.png', 'audio/bgm/**/*.mp3'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/battlefields\/[^/]+\.png$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'battlefield-images',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/audio\/bgm\/.*\.mp3$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bgm-audio',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Beyond the Veil - LOTM TCG',
        short_name: 'LOTM TCG',
        description: 'Trading Card Game based on Lord of the Mysteries',
        theme_color: '#1a0a2e',
        background_color: '#0d0015',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'game-engine': path.resolve(__dirname, '../game-engine/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
