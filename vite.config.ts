import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Pages supplies the repository or custom-domain base during deployment.
    base: process.env.PAGES_BASE_PATH || '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // Allow resource-limited development environments to disable hot reload.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Stop file watching when hot reload is disabled.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
