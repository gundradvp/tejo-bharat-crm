import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function groundReportsPersistencePlugin(): Plugin {
  return {
    name: 'ground-reports-persistence',
    configureServer(server) {
      server.middlewares.use('/api/save-ground-reports', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (Array.isArray(data)) {
                const targetPath = path.resolve(__dirname, 'public/s_numbers_ground_reports.json');
                fs.writeFileSync(targetPath, JSON.stringify(data), 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, count: data.length }));
                return;
              }
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Expected JSON array' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), groundReportsPersistencePlugin()],
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
