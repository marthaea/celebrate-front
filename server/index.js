import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import app from "./app.js";

// In production the same server also serves the built React app.
// STATIC_DIR picks which front end to serve: the phone app (dist, the default) or the website (site/dist).
const dist = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`CELEBRATE API listening on http://localhost:${port}`));

