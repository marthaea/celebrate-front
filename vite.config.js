import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The React app talks to the Node API through /api; in development Vite forwards it to the
// stand-in API on this computer, or with `npm run dev:web:live` (vite --mode live) to the live backend.
const LIVE_API = "https://celebrate-api.thewtontech.com";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Plain CSS only; this also stops Vite picking up the parent project's PostCSS setup.
  css: { postcss: { plugins: [] } },
  server: {
    port: 5174,
    proxy: { "/api": mode === "live" ? { target: LIVE_API, changeOrigin: true } : "http://localhost:3001" },
  },
}));
