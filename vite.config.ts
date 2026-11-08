import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the static build works on GitHub Pages sub-paths and on Vercel alike.
export default defineConfig({
  base: './',
  plugins: [react()],
  // three.js is only reached through the lazy ModelViewer import, so it lands in its
  // own chunk that the landing page never downloads.
  build: { chunkSizeWarningLimit: 1200 },
});
