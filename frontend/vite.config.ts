import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: Number(env.FRONTEND_PORT || 3000),
      strictPort: true,
    },
    preview: {
      host: true,
      port: Number(env.FRONTEND_PORT || 3000),
      strictPort: true,
    },
  };
});
