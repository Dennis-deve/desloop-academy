import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// A distinct, static review artifact. Never reuse the private application's
// entry point or put synthetic learner data into the design-only file.
export default defineConfig({
  root: path.resolve(__dirname, 'design/learning-loop'),
  publicDir: false,
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    outDir: path.resolve(__dirname, 'dist/learning-loop-review'),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
