// Files people add: a vendor's registration certificate or national ID, photos of past work and of
// services, and evidence for a complaint.
//
// Here files are kept in the same store as everything else, which suits a demonstration but not
// real use: a real backend should put them in object storage (S3, Cloudinary, Netlify Blobs with
// its own store) and keep identity documents encrypted. The routes stay the same either way.
import crypto from "node:crypto";
import { claimsOf } from "./auth.js";
import { read, write } from "./store.js";
import { safe } from "./core.js";

const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 2.5 * 1024 * 1024;
// Work and service photos are shown to everyone; documents and evidence only to those involved.
const PUBLIC = ["work", "service"];
const PURPOSES = ["proof", "work", "service", "evidence"];

const who = (claims) => (claims?.role === "admin" ? "admin" : claims?.role === "vendor" ? `vendor:${claims.vendor}` : claims?.role === "customer" ? `customer:${claims.customer}` : null);

/** Lets more people see private files, for example the vendor named in a complaint. */
export async function addReaders(ids, readers) {
  for (const fileId of ids ?? []) {
    const file = await read(`upload:${fileId}`, null);
    if (!file) continue;
    await write(`upload:${fileId}`, { ...file, readers: [...new Set([...(file.readers ?? []), ...readers])] });
  }
}

/** The files, from `ids`, that belong to `owner` (so nobody attaches someone else's). */
export async function ownedBy(ids, owner) {
  const mine = [];
  for (const fileId of ids ?? []) {
    const file = await read(`upload:${fileId}`, null);
    if (file?.owner === owner) mine.push(fileId);
  }
  return mine;
}

export async function describeUploads(ids) {
  const list = [];
  for (const fileId of ids ?? []) {
    const file = await read(`upload:${fileId}`, null);
    if (file) list.push({ id: file.id, name: file.name, type: file.type, size: file.size, purpose: file.purpose, url: `/api/uploads/${file.id}` });
  }
  return list;
}

export function addUploads(app, express) {
  app.post("/api/uploads", express.json({ limit: "4mb" }), safe(async (req, res) => {
    const owner = who(claimsOf(req));
    if (!owner || owner === "admin") return res.status(401).json({ error: "Sign in to add files." });
    const { name, type, data, purpose } = req.body ?? {};
    if (!PURPOSES.includes(purpose)) return res.status(400).json({ error: "Say what the file is for." });
    if (!TYPES.includes(type)) return res.status(400).json({ error: "Add a photo (JPEG, PNG or WebP) or a PDF." });
    const base64 = String(data ?? "").replace(/^data:[^;]+;base64,/, "");
    const size = Math.floor((base64.length * 3) / 4);
    if (!base64 || size > MAX_BYTES) return res.status(400).json({ error: "Each file must be smaller than 2.5 MB." });
    const count = (await read(`uploads-of:${owner}`, [])).length;
    if (count >= 60) return res.status(429).json({ error: "You have added the most files allowed. Contact Celebrate." });
    const file = {
      id: crypto.randomBytes(9).toString("base64url"), owner, purpose, name: String(name ?? "file").slice(0, 80), type, size,
      data: base64, public: PUBLIC.includes(purpose), readers: [], createdAt: new Date().toISOString(),
    };
    await write(`upload:${file.id}`, file);
    await write(`uploads-of:${owner}`, [...(await read(`uploads-of:${owner}`, [])), file.id]);
    res.status(201).json({ id: file.id, name: file.name, type, size, purpose, url: `/api/uploads/${file.id}` });
  }));

  // Public files open for anyone; private ones need the owner, the admin or someone given access.
  app.get("/api/uploads/:id", safe(async (req, res) => {
    const file = await read(`upload:${req.params.id}`, null);
    if (!file) return res.status(404).json({ error: "Not found." });
    if (!file.public) {
      const viewer = who(claimsOf(req));
      if (!viewer || (viewer !== "admin" && viewer !== file.owner && !file.readers?.includes(viewer))) {
        return res.status(404).json({ error: "Not found." });
      }
    }
    res.setHeader("Content-Type", file.type);
    res.setHeader("Cache-Control", file.public ? "public, max-age=86400" : "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `${file.type === "application/pdf" ? "attachment" : "inline"}; filename="${file.name.replace(/[^\w. -]/g, "_")}"`);
    res.send(Buffer.from(file.data, "base64"));
  }));
}
