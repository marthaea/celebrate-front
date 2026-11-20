import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// The editorial website. It shares the API and the plan logic (../src) with the phone app.
export default defineConfig({
  root: here,
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: {
    port: 5175,
    proxy: { "/api": "http://localhost:3001", "/sitemap.xml": "http://localhost:3001", "/robots.txt": "http://localhost:3001" },
    fs: { allow: [path.join(here, "..")] },
  },
  build: { outDir: path.join(here, "dist"), emptyOutDir: true },
});
