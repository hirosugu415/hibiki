import { defineConfig } from 'vite';

// base を './' にしておくと、どのパスから配信してもアセットが読める
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
