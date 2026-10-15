import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const backendTarget =
    loadEnv(mode, '.', 'VITE_')['VITE_BACKEND_URL'] ?? 'http://localhost:4001';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/ws/app': { target: backendTarget, changeOrigin: true, ws: true },
      },
    },
    build: { sourcemap: false },
  };
});
