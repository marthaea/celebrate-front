import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Where /api goes in development. `npm run dev:site` uses the stand-in API on this computer;
// `npm run dev:live` (vite --mode live) uses the team's live backend instead.
export const LIVE_API = "https://celebrate-api.thewtontech.com";
const target = (mode) => (mode === "live" ? LIVE_API : "http://localhost:3001");
const forward = (mode) => ({ target: target(mode), changeOrigin: true });

// The editorial website. It shares the API and the plan logic (../src) with the phone app.
export default defineConfig(({ mode }) => ({
  root: here,
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: {
    port: 5175,
    proxy: { "/api": forward(mode), "/sitemap.xml": forward(mode), "/robots.txt": forward(mode) },
    fs: { allow: [path.join(here, "..")] },
  },
  build: { outDir: path.join(here, "dist"), emptyOutDir: true },
}));
