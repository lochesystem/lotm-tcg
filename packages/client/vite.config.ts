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
