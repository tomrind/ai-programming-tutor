import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Anfragen an /api gehen ans Backend. Dadurch laeuft alles unter
      // derselben Herkunft - kein CORS, und SSE funktioniert unveraendert.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
