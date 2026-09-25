import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/apepdcl': {
        target: 'https://epccbopn.apeasternpower.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apepdcl/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      // Proxy Meta Graph API calls to avoid CORS from browser
      '/api/meta': {
        target: 'https://graph.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/meta/, ''),
        secure: true,
      },
    },
  },
});
