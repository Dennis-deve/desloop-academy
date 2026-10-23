import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// A physically separate static artifact. Do not reuse Vite's normal index.html:
// it imports private pilot/AI chunks and calls the same-origin adult status API.
export default defineConfig({
  root: path.resolve(__dirname, 'public-render'),
  publicDir: false,
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    outDir: path.resolve(__dirname, 'dist/render-public'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
