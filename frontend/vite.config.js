import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Main App:      VITE_APP=main     → port 5173
// On-Chain (BC): VITE_APP=explorer → port 5174
// Off-Chain:     VITE_APP=dashboard → port 5175
const appMode = process.env.VITE_APP || 'main';

const configs = {
  main: {
    port: 5173,
    input: resolve(__dirname, 'index.html'),
  },
  explorer: {
    port: 5174,
    input: resolve(__dirname, 'explorer.html'),
  },
  dashboard: {
    port: 5175,
    input: resolve(__dirname, 'dashboard.html'),
  },
};

const current = configs[appMode] || configs.main;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: current.port,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: current.input,
    },
  },
});
