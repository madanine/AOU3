import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
        },
        manifest: {
          name: 'American Open University Portal',
          short_name: 'AOU',
          description: 'Portal for American Open University',
          theme_color: '#1e3a8a',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      // Increase warning threshold to avoid false alarms from large-but-expected pages
      chunkSizeWarningLimit: 1000,
      cssMinify: true,
      rollupOptions: {
        output: {
          // Smart function-based splitting: separates bundles by user role
          // so each user only downloads what they need
          manualChunks(id: string) {
            // ── Heavy external libraries ─────────────────────────────────────
            if (id.includes('node_modules/recharts')) return 'lib-charts';
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'lib-pdf';
            if (id.includes('node_modules/xlsx')) return 'lib-xlsx';
            if (id.includes('node_modules/@supabase')) return 'lib-supabase';
            if (id.includes('node_modules/react-dom')) return 'lib-react-dom';
            if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) return 'lib-router';
            if (id.includes('node_modules/react')) return 'lib-react';
            if (id.includes('node_modules/lucide-react')) return 'lib-icons';

            // ── App pages by role — loaded only when that role logs in ────────
            if (id.includes('/pages/admin/')) return 'pages-admin';
            if (id.includes('/pages/student/')) return 'pages-student';
            if (id.includes('/pages/supervisor/')) return 'pages-supervisor';
            // Note: pages/auth/ is eagerly loaded so we leave it in the main bundle

            // ── Shared app code ───────────────────────────────────────────────
            if (id.includes('/components/')) return 'app-components';
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
