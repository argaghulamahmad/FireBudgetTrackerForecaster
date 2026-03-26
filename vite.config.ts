import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        devOptions: {
          enabled: process.env.VITE_PWA_DEV !== 'false',
          suppressWarnings: true,
        },
        manifest: {
          name: 'Budget Tracker Forecaster',
          short_name: 'BudgetFire',
          description: 'Offline-first recurring budget tracker with workday-aware daily allowance calculations',
          theme_color: '#4F46E5',
          background_color: '#F2F2F7',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    sourceMap: false,
    build: {
      // Suppress chunk size warning for vendor bundles (expected to be large)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase Firestore only loaded after authentication
            if (id.includes('node_modules/firebase/firestore')) {
              return 'firestore-chunk';
            }

            // Settings page — lazy loaded on-demand
            if (id.includes('src/pages/Settings')) {
              return 'pages-settings';
            }

            // Home page — lazy loaded on-demand (for deep-link support)
            if (id.includes('src/pages/Home')) {
              return 'pages-home';
            }

            // Vendor bundles — stable, cacheable
            if (id.includes('node_modules/firebase/app')) {
              return 'firebase-auth';
            }

            if (id.includes('node_modules/tailwindcss') || id.includes('node_modules/@tailwindcss')) {
              return 'vendor-css';
            }

            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }

            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
