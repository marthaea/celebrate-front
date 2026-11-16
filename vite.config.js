import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The React app talks to the Node API through /api; in development Vite forwards it.
export default defineConfig({
  plugins: [react()],
  // Plain CSS only; this also stops Vite picking up the parent project's PostCSS setup.
  css: { postcss: { plugins: [] } },
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:3001" },
  },
});
