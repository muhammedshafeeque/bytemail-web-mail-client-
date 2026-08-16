import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'ByteMail',
        short_name: 'ByteMail',
        description: 'Modern email client for repod.online',
        theme_color: '#0D9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/emails\?/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'emails-list-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 3 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\/api\/emails\/[^/]+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'single-email-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: /\/api\/emails\/send/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'send-email-cache',
              backgroundSync: {
                name: 'send-email-queue',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3500', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3500', ws: true, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-motion': ['framer-motion'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
