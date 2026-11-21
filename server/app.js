// The Celebrate API: a working stand-in for the real backend, built to the contract in docs/API.md.
// Every route here is one the website calls; a real backend that answers the same routes with the
// same shapes can replace this file by file.
import express from "express";
import { CATEGORIES, DISTRICTS, EVENT_NOTES, EVENT_TYPES, OFFER_IDS, PAYMENT_METHODS, VISIT_TIMES } from "./data.js";
import { OPTIONS } from "./options.js";
import { addExtras } from "./extras.js";
import { claimsOf, TURNSTILE } from "./auth.js";
import { mayUse, SIMULATED_SMS, TERMS_VERSION } from "./customers.js";
import { buildQuote, DEPOSIT_RATE, PLATFORM_FEE_RATE, validateEvent } from "./pricing.js";
import { bookedDays, nextFreeDate, unavailable } from "./availability.js";
import { read, write } from "./store.js";
import { addStaff, AGREEMENT_VERSION, DEMO, DEMO_ADMIN_PASSWORD, DEMO_VENDOR_PASSWORD } from "./staff.js";
import { loadBusy, loadCatalogue } from "./vendors.js";
import { addOrders, CASE_WORKING_DAYS, CONFIRM_HOURS, loadBookings, REFUND_RULES, RESPOND_HOURS, SIMULATED_PAYMENTS } from "./orders.js";
import { addUploads } from "./uploads.js";
import { money, safe } from "./core.js";
import { renderRobots, renderSitemap } from "../site/src/seoText.js";

const app = express();
// Uploads take larger bodies on their own route; everything else stays small.
addUploads(app, express);
app.use(express.json({ limit: "50kb" }));
// Behind Netlify or another proxy, so the site's own address (for the sitemap) is read correctly.
app.set("trust proxy", true);

/** The site's public address: SITE_URL if set, otherwise the address the request came in on. */
export const siteOrigin = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`).replace(/\/$/, "");

app.get("/api/health", (_req, res) => res.json({ ok: true, database: "memory", time: new Date().toISOString() }));

// The audit log: who did what among the actions that matter (staff sign-ins, admin decisions,
// deleted accounts). Kept to the latest 500 entries here; the real backend keeps it in its database.
const AUDITED = /^\/api\/(admin\/|staff\/login$|me\/delete$)/;
app.use((req, res, next) => {
  if (req.method !== "POST" || !AUDITED.test(req.path)) return next();
  const claims = claimsOf(req);
  const actor = claims?.role === "admin" ? "admin" : claims?.role === "vendor" ? `vendor:${claims.vendor}`
    : claims?.role === "customer" ? `customer:${claims.customer}` : req.path === "/api/staff/login" ? `${req.body?.role ?? "staff"} sign-in` : "anonymous";
  res.on("finish", async () => {
    const entry = { at: new Date().toISOString(), actor, action: req.path.replace(/^\/api\//, ""), outcome: res.statusCode < 400 ? "ok" : `refused (${res.statusCode})` };
    if (req.body?.action) entry.detail = String(req.body.action).slice(0, 40);
    await write("audit", [entry, ...(await read("audit", []))].slice(0, 500));
  });
  next();
});

app.get("/api/admin/audit", safe(async (req, res) => {
  if (claimsOf(req)?.role !== "admin") return res.status(401).json({ error: "Please sign in again." });
  res.json(await read("audit", []));
}));

app.get(["/sitemap.xml", "/api/sitemap.xml"], safe(async (req, res) => {
  res.type("application/xml").send(renderSitemap(siteOrigin(req), (await loadCatalogue()).visible));
}));

app.get(["/robots.txt", "/api/robots.txt"], (req, res) => res.type("text/plain").send(renderRobots(siteOrigin(req))));

const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));

app.get("/api/meta", (_req, res) => {
  res.json({
    eventTypes: EVENT_TYPES, eventNotes: EVENT_NOTES, districts: DISTRICTS, categories: CATEGORIES, paymentMethods: PAYMENT_METHODS,
    depositRate: DEPOSIT_RATE, feeRate: PLATFORM_FEE_RATE, visitTimes: VISIT_TIMES, options: OPTIONS,
    rules: {
      respondHours: RESPOND_HOURS, confirmHours: CONFIRM_HOURS, caseWorkingDays: CASE_WORKING_DAYS,
      refunds: REFUND_RULES.map(({ rate, text }) => ({ rate, text })),
    },
    versions: { terms: TERMS_VERSION, vendorAgreement: AGREEMENT_VERSION },
    turnstile: { siteKey: TURNSTILE.siteKey, test: TURNSTILE.test },
    // What is simulated until the real services are connected. The site says so where it matters.
    simulated: { payments: SIMULATED_PAYMENTS, sms: SIMULATED_SMS },
    // Optional features the site switches on only when the backend has them.
    features: { vendorPasswordReset: true },
    // In demo mode (no ADMIN_PASSWORD set) the sign-in pages show these so the interfaces can be tried.
    demo: DEMO ? { admin: DEMO_ADMIN_PASSWORD, vendor: DEMO_VENDOR_PASSWORD } : null,
  });
});

const photoUrls = (service) => (service.photoIds ?? []).map((id) => `/api/uploads/${id}`);
const forCustomers = (service) => {
  const { photoIds, ...rest } = service;
  return { ...rest, photoUrls: photoUrls(service) };
};

// C1, C2: browse a category, search, and filter by district, price and rating.
app.get("/api/services", safe(async (req, res) => {
  const { category, filter, district, sort } = req.query;
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const minPrice = Number(req.query.minPrice) || 0;
  const maxPrice = Number(req.query.maxPrice) || Infinity;
  const minRating = Number(req.query.minRating) || 0;
  let list = (await loadCatalogue()).visible;
  if (category) list = list.filter((service) => service.category === category);
  if (q) {
    // Every word must appear somewhere; "in" and "near" are ignored so "tents in Mukono" works.
    const words = q.split(/\s+/).filter((word) => !["in", "near", "at", "for", "a", "the"].includes(word));
    list = list.filter((service) => {
      const haystack = [service.name, service.vendor, service.district, service.category, categoryById.get(service.category).title].join(" ").toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }
  // "other": vendors outside the listed districts.
  if (district === "other") list = list.filter((service) => !DISTRICTS.includes(service.district));
  else if (district) list = list.filter((service) => service.district === district);
  list = list.filter((service) => service.price >= minPrice && service.price <= maxPrice && (service.rating || 0) >= minRating);
  if (filter === "under500k") list = list.filter((service) => service.price < 500000);
  if (filter === "top") list = list.filter((service) => service.rating >= 4.7);
  if (filter === "offers") list = list.filter((service) => service.wasPrice);
  if (sort === "price") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "-price") list = [...list].sort((a, b) => b.price - a.price);
  if (sort === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  res.json(list.map(forCustomers));
}));

// C3: one listing, with the settings a host can choose for it.
app.get("/api/services/:id", safe(async (req, res) => {
  const service = (await loadCatalogue()).visible.find((s) => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "We could not find that service." });
  res.json({ ...forCustomers(service), options: OPTIONS[service.category] ?? [] });
}));

app.get("/api/offers", safe(async (_req, res) => {
  const list = (await loadCatalogue()).visible;
  res.json(OFFER_IDS.map((id) => list.find((s) => s.id === id)).filter(Boolean).map(forCustomers));
}));

// D1: the grand total for a plan. `choices` holds each service's settings.
app.post("/api/quote", safe(async (req, res) => {
  const { event, items, choices } = req.body ?? {};
  const errors = validateEvent(event);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Your plan is empty." });
  const catalogue = await loadCatalogue();
  const services = [...new Set(items)].map((id) => catalogue.byId.get(id));
  if (services.some((s) => !s)) return res.status(400).json({ error: "A service in your plan is no longer available." });
  res.json(buildQuote(services, event, choices ?? {}));
}));

// Every way of filling each category for this event, at its listed settings, with what it would
// cost all-in before the platform fee. The budget planner and the compare page are built on this.
app.post("/api/options", safe(async (req, res) => {
  const { event } = req.body ?? {};
  const errors = validateEvent(event);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  const list = (await loadCatalogue()).visible;
  const categories = CATEGORIES.map((category) => ({
    ...category,
    options: list.filter((service) => service.category === category.id)
      .map((service) => {
        const quote = buildQuote([service], event);
        const { id, name, vendor, district, rating, reviews, verified } = service;
        return { id, name, vendor, district, rating, reviews, verified, cost: quote.itemCost + quote.labour + quote.transport };
      })
      .sort((a, b) => a.cost - b.cost),
  }));
  res.json({ categories, feeRate: PLATFORM_FEE_RATE });
}));

app.get("/api/services/:id/availability", safe(async (req, res) => {
  const catalogue = await loadCatalogue();
  if (!catalogue.byId.has(req.params.id)) return res.status(404).json({ error: "We could not find that service." });
  const month = String(req.query.month ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "Choose a month." });
  res.json({ month, booked: bookedDays(req.params.id, month, await loadBookings(), await loadBusy(catalogue)) });
}));

// C6: whether each vendor in a plan is free on the date, the nearest date when all are, and
// similar vendors who are free that day for any who are not.
app.post("/api/availability", safe(async (req, res) => {
  const { date, items } = req.body ?? {};
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose an event date." });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Your plan is empty." });
  const catalogue = await loadCatalogue();
  const ids = [...new Set(items)].filter((id) => catalogue.byId.has(id));
  const bookings = await loadBookings();
  const busy = await loadBusy(catalogue);
  const clash = unavailable(ids, date, bookings, busy);
  const similar = {};
  for (const id of clash) {
    const taken = catalogue.byId.get(id);
    similar[id] = catalogue.visible
      .filter((s) => s.category === taken.category && s.id !== id && !ids.includes(s.id))
      .filter((s) => !unavailable([s.id], date, bookings, busy).length)
      .sort((a, b) => Math.abs(a.price - taken.price) - Math.abs(b.price - taken.price) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map(({ id: sid, name, vendor, district, price, unit, rating, reviews }) => ({ id: sid, name, vendor, district, price, unit, rating, reviews }));
  }
  res.json({ date, unavailable: clash, nextFree: clash.length ? nextFreeDate(ids, date, bookings, busy) : date, similar });
}));

// What a vendor scanning a receipt's QR code may see: that the booking is real, what was booked
// and whether it is paid. Not the host's phone number or messages.
app.get("/api/bookings/:id/verify", safe(async (req, res) => {
  const booking = (await loadBookings()).find((b) => b.id === req.params.id);
  if (!booking || booking.status === "awaiting_payment") return res.status(404).json({ error: "We could not find that booking." });
  const { id, event, quote, total, paid, balance, method, vendors, status } = booking;
  res.json({
    id, status, total, paid, balance: balance ?? 0, method,
    customer: String(booking.customer ?? "").split(" ")[0],
    event: { type: event.type, date: event.date, district: event.district, guests: event.guests },
    quote: { lines: quote.lines.map(({ id: lineId, name, vendor, detail, settings }) => ({ id: lineId, name, vendor, detail, settings })) },
    vendors: vendors.map(({ serviceId, vendor, status: lineStatus }) => ({ serviceId, vendor, status: lineStatus })),
  });
}));

app.get("/api/bookings/:id/receipt", safe(async (req, res) => {
  const booking = (await loadBookings()).find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "We could not find that booking." });
  if (!(await mayUse(req, booking))) return res.status(403).json({ error: "This booking belongs to another account. Sign in as its owner." });
  const { quote, event } = booking;
  const row = (label, value) => `${label.padEnd(44, " ")}${value.padStart(16, " ")}`;
  const text = [
    "CELEBRATE · Tukusanyukidde",
    "E-RECEIPT",
    "",
    row("E-receipt no.", booking.id),
    row("Paid", money(booking.paid)),
    row("Method", booking.method),
    row("Event", `${event.type}, ${event.date}`),
    row("District", event.district),
    row("Guests", String(event.guests)),
    "",
    ...quote.lines.map((line) => row(`${line.name} (${line.vendor})`.slice(0, 43), money(line.amount))),
    "",
    row("Item cost", money(quote.itemCost)),
    row("Labour and setup", money(quote.labour)),
    row("Transport", money(quote.transport)),
    row(`Platform fee (${Math.round(quote.feeRate * 100)}%)`, money(quote.platformFee)),
    row("GRAND TOTAL", money(booking.total)),
    "",
    "Webale nnyo!",
    "",
  ].join("\n");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${booking.id}.txt"`);
  res.send(text);
}));

// Pledges towards a shared plan. A pledge is a promise recorded against the plan's key; no money
// is collected here. Collecting contributions needs the payment provider.
const pledgeKey = (key) => (/^[a-z0-9]{6,16}$/.test(key) ? `pledges:${key}` : null);

app.get("/api/pledges/:key", safe(async (req, res) => {
  const key = pledgeKey(req.params.key);
  if (!key) return res.status(400).json({ error: "That link is not valid." });
  res.json(await read(key, []));
}));

app.post("/api/pledges/:key", safe(async (req, res) => {
  const key = pledgeKey(req.params.key);
  if (!key) return res.status(400).json({ error: "That link is not valid." });
  const name = String(req.body?.name ?? "").trim().slice(0, 40);
  const amount = Number(req.body?.amount);
  const towards = String(req.body?.towards ?? "").trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: "Tell us your name." });
  if (!Number.isInteger(amount) || amount < 1000 || amount > 100000000) {
    return res.status(400).json({ error: "Enter an amount from UGX 1,000 to UGX 100,000,000." });
  }
  const pledges = await read(key, []);
  if (pledges.length >= 200) return res.status(400).json({ error: "This plan has reached its limit of pledges." });
  const next = [...pledges, { name, amount, towards, at: new Date().toISOString() }];
  await write(key, next);
  res.status(201).json(next);
}));

addOrders(app);
addExtras(app);
addStaff(app);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "That is too large to send." });
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

export default app;
