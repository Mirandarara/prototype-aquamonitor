import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { strictPort: true, fs: { allow: [".."] } },
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
