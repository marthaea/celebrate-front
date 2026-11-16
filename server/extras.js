// Everything around a booking that is not the booking itself: paying the balance, messages to
// vendors, visits before the day, and the login check. Like the rest of the sample API, this
// is a working stand-in for the real backend.
import { PAYMENT_METHODS, VISIT_TIMES } from "./data.js";
import { unavailable } from "./availability.js";
import { read, write } from "./store.js";
import { loadBusy } from "./vendors.js";

// Cloudflare Turnstile checks that a login comes from a person. Until real keys are set
// (TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY), Cloudflare's public test keys are used: they always pass.
export const TURNSTILE = {
  siteKey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
  secret: process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA",
  test: !(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
};

/** Checks a payment choice. Returns { method, phone } or { error }. */
export function readPayment(payment) {
  const method = PAYMENT_METHODS.find((m) => m.id === payment?.method);
  if (!method) return { error: "Choose how to pay." };
  const phone = String(payment?.phone ?? "").replace(/\s+/g, "");
  if (method.needsPhone && !/^(0|\+?256)7\d{8}$/.test(phone)) {
    return { error: "Enter a valid mobile money number, like 0770 000 000." };
  }
  return { method, phone };
}

/** Customers and vendors talk on the site only: phone numbers and email addresses are taken out of messages. */
export function hideContacts(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number removed]");
}

/** Asks Cloudflare whether a Turnstile token is good. Returns {} or { error, status }. */
export async function verifyHuman(token) {
  if (!token) return { error: "Complete the security check first.", status: 400 };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: TURNSTILE.secret, response: String(token) }),
    });
    const verdict = await response.json();
    return verdict?.success ? {} : { error: "The security check did not pass. Please try again.", status: 403 };
  } catch {
    return { error: "We could not reach the security check. Try again in a moment.", status: 503 };
  }
}

const isDate = (text) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
const today = () => new Date().toISOString().slice(0, 10);

export function addExtras(app, { safe, loadBookings, byId, categoryById }) {
  // Paying the rest, on the day of the event or before it. As with the deposit, no money moves yet.
  app.post("/api/bookings/:id/balance", safe(async (req, res) => {
    const bookings = await loadBookings();
    const booking = bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!booking.balance) return res.status(400).json({ error: "This booking is already paid in full." });
    const { method, error } = readPayment(req.body?.payment);
    if (error) return res.status(400).json({ error });
    const settled = { ...booking, paid: booking.total, balance: 0, balanceMethod: method.name, balancePaidAt: new Date().toISOString() };
    await write("bookings", bookings.map((b) => (b.id === booking.id ? settled : b)));
    res.json(settled);
  }));

  // Messages between a customer and the vendors on their booking. Vendors read and answer them
  // in their workspace (staff.js).
  const messagesKey = (id) => `messages:${id}`;

  app.get("/api/bookings/:id/messages", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    res.json(await read(messagesKey(booking.id), []));
  }));

  app.post("/api/bookings/:id/messages", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    const serviceId = String(req.body?.serviceId ?? "");
    const vendor = booking.quote.lines.find((line) => line.id === serviceId)?.vendor;
    if (!vendor) return res.status(400).json({ error: "That vendor is not on this booking." });
    const raw = String(req.body?.text ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Write a message first." });
    if (raw.length > 500) return res.status(400).json({ error: "Keep messages under 500 characters." });
    const text = hideContacts(raw);
    const all = await read(messagesKey(booking.id), []);
    if (all.length >= 300) return res.status(400).json({ error: "This booking has reached its message limit." });
    const at = new Date().toISOString();
    const next = [...all, { serviceId, from: "customer", text, hidden: text !== raw, at }];
    if (!all.some((message) => message.serviceId === serviceId)) {
      next.push({ serviceId, from: "system", text: `Delivered to ${vendor}. Their reply will appear here.`, at });
    }
    await write(messagesKey(booking.id), next);
    res.status(201).json(next);
  }));

  // Visits to a vendor before the day: tastings, fittings, viewings.
  const loadVisits = () => read("appointments", []);
  const live = (visit) => visit.status !== "Cancelled";

  app.get("/api/services/:id/slots", safe(async (req, res) => {
    const service = byId.get(req.params.id);
    if (!service) return res.status(404).json({ error: "We could not find that service." });
    const date = String(req.query.date ?? "");
    if (!isDate(date)) return res.status(400).json({ error: "Choose a date." });
    const atEvent = unavailable([service.id], date, await loadBookings(), await loadBusy()).length > 0;
    const taken = (await loadVisits()).filter((v) => v.serviceId === service.id && v.date === date && live(v)).map((v) => v.time);
    const free = atEvent || date <= today() ? [] : VISIT_TIMES.filter((time) => !taken.includes(time));
    res.json({ date, kind: categoryById.get(service.category).visit, free, atEvent });
  }));

  app.post("/api/appointments", safe(async (req, res) => {
    const service = byId.get(String(req.body?.serviceId ?? ""));
    if (!service) return res.status(400).json({ error: "We could not find that service." });
    const name = String(req.body?.name ?? "").trim().slice(0, 40);
    const date = String(req.body?.date ?? "");
    const time = String(req.body?.time ?? "");
    if (!name) return res.status(400).json({ error: "Tell us your name." });
    if (!isDate(date) || date <= today()) return res.status(400).json({ error: "Choose a date from tomorrow onwards." });
    if (!VISIT_TIMES.includes(time)) return res.status(400).json({ error: "Choose a time." });
    if (unavailable([service.id], date, await loadBookings(), await loadBusy()).length) {
      return res.status(409).json({ error: `${service.vendor} is not available that day. Choose another date.` });
    }
    const visits = await loadVisits();
    if (visits.some((v) => v.serviceId === service.id && v.date === date && v.time === time && live(v))) {
      return res.status(409).json({ error: "That time has just been taken. Choose another." });
    }
    const visit = {
      id: `APT-${String(visits.length + 1).padStart(4, "0")}`,
      serviceId: service.id, service: service.name, vendor: service.vendor, district: service.district,
      kind: categoryById.get(service.category).visit, date, time, name,
      status: "Requested", createdAt: new Date().toISOString(),
    };
    await write("appointments", [...visits, visit]);
    res.status(201).json(visit);
  }));

  app.get("/api/appointments", safe(async (req, res) => {
    const ids = String(req.query.ids ?? "").split(",").filter(Boolean).slice(0, 50);
    res.json((await loadVisits()).filter((v) => ids.includes(v.id)));
  }));

  app.post("/api/appointments/:id/cancel", safe(async (req, res) => {
    const visits = await loadVisits();
    const visit = visits.find((v) => v.id === req.params.id);
    if (!visit) return res.status(404).json({ error: "We could not find that appointment." });
    const cancelled = { ...visit, status: "Cancelled" };
    await write("appointments", visits.map((v) => (v.id === visit.id ? cancelled : v)));
    res.json(cancelled);
  }));

  // Logging in: Cloudflare must confirm the visitor is a person before the name is accepted.
  app.post("/api/login", safe(async (req, res) => {
    const name = String(req.body?.name ?? "").trim().slice(0, 40);
    const token = String(req.body?.token ?? "");
    if (!name) return res.status(400).json({ error: "Tell us your name." });
    const human = await verifyHuman(token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    res.json({ ok: true, name });
  }));
}
