import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { fs: { allow: [".."] } },
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
