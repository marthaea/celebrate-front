import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import app, { siteOrigin } from "./app.js";
import { safe } from "./core.js";
import { loadCatalogue } from "./vendors.js";
import { injectHead, pageMeta, renderHead } from "../site/src/seoText.js";

// In production the same server also serves the built React app.
// STATIC_DIR picks which front end to serve: the phone app (dist, the default) or the website (site/dist).
const dist = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (fs.existsSync(dist)) {
  const page = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  app.use(express.static(dist, { index: false }));
  // Every page is the same app; its title, description, share image and structured data are
  // written in here so search engines and link previews see the right ones.
  app.get("*", safe(async (req, res) => {
    let service;
    const id = req.path.match(/^\/service\/([^/]+)$/)?.[1];
    if (id) service = (await loadCatalogue()).visible.find((s) => s.id === decodeURIComponent(id));
    if (service) service = { ...service, photoUrls: (service.photoIds ?? []).map((p) => `/api/uploads/${p}`) };
    const head = renderHead(pageMeta(req.path, { service }), siteOrigin(req), { verification: process.env.GOOGLE_SITE_VERIFICATION });
    res.type("html").send(injectHead(page, head));
  }));
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`CELEBRATE API listening on http://localhost:${port}`));

