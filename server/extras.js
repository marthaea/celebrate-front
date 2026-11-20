// Messages between hosts and vendors, and visits before the day (tastings, fittings, viewings).
// Contact stays on the site: phone numbers and email addresses are taken out of messages.
import { CATEGORIES, VISIT_TIMES } from "./data.js";
import { unavailable } from "./availability.js";
import { read, write } from "./store.js";
import { loadBusy, loadCatalogue } from "./vendors.js";
import { currentCustomer, mayUse } from "./customers.js";
import { loadBookings } from "./orders.js";
import { hideContacts, isDate, notify, now, safe, today } from "./core.js";

// Kept here so older imports keep working.
export { TURNSTILE, verifyHuman } from "./auth.js";
export { readPayment } from "./orders.js";
export { hideContacts } from "./core.js";

const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));
const deny = (res) => res.status(403).json({ error: "This booking belongs to another account. Sign in as its owner." });

export function addExtras(app) {
  const messagesKey = (id) => `messages:${id}`;

  app.get("/api/bookings/:id/messages", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    res.json(await read(messagesKey(booking.id), []));
  }));

  app.post("/api/bookings/:id/messages", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const serviceId = String(req.body?.serviceId ?? "");
    const line = booking.vendors.find((v) => v.serviceId === serviceId);
    if (!line) return res.status(400).json({ error: "That vendor is not on this booking." });
    const raw = String(req.body?.text ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Write a message first." });
    if (raw.length > 500) return res.status(400).json({ error: "Keep messages under 500 characters." });
    const text = hideContacts(raw);
    const all = await read(messagesKey(booking.id), []);
    if (all.length >= 300) return res.status(400).json({ error: "This booking has reached its message limit." });
    const at = now();
    const next = [...all, { serviceId, from: "customer", text, hidden: text !== raw, at }];
    if (!all.some((message) => message.serviceId === serviceId)) {
      next.push({ serviceId, from: "system", text: `Delivered to ${line.vendor}. Their reply will appear here.`, at });
    }
    await write(messagesKey(booking.id), next);
    await notify({ to: `vendor:${line.vendorId}`, text: `New message from ${booking.customer || "a customer"} about ${booking.id}.`, link: "/vendor" });
    res.status(201).json(next);
  }));

  const loadVisits = () => read("appointments", []);
  const live = (visit) => !["Cancelled", "Declined"].includes(visit.status);

  app.get("/api/services/:id/slots", safe(async (req, res) => {
    const catalogue = await loadCatalogue();
    const service = catalogue.visible.find((s) => s.id === req.params.id);
    if (!service) return res.status(404).json({ error: "We could not find that service." });
    const date = String(req.query.date ?? "");
    if (!isDate(date)) return res.status(400).json({ error: "Choose a date." });
    const atEvent = unavailable([service.id], date, await loadBookings(), await loadBusy(catalogue)).length > 0;
    const taken = (await loadVisits()).filter((v) => v.serviceId === service.id && v.date === date && live(v)).map((v) => v.time);
    const free = atEvent || date <= today() ? [] : VISIT_TIMES.filter((time) => !taken.includes(time));
    res.json({ date, kind: categoryById.get(service.category).visit, free, atEvent });
  }));

  app.post("/api/appointments", safe(async (req, res) => {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(401).json({ error: "Sign in to ask for an appointment." });
    const catalogue = await loadCatalogue();
    const service = catalogue.visible.find((s) => s.id === String(req.body?.serviceId ?? ""));
    if (!service) return res.status(400).json({ error: "We could not find that service." });
    const date = String(req.body?.date ?? "");
    const time = String(req.body?.time ?? "");
    if (!isDate(date) || date <= today()) return res.status(400).json({ error: "Choose a date from tomorrow onwards." });
    if (!VISIT_TIMES.includes(time)) return res.status(400).json({ error: "Choose a time." });
    if (unavailable([service.id], date, await loadBookings(), await loadBusy(catalogue)).length) {
      return res.status(409).json({ error: `${service.vendor} is not available that day. Choose another date.` });
    }
    const visits = await loadVisits();
    if (visits.some((v) => v.serviceId === service.id && v.date === date && v.time === time && live(v))) {
      return res.status(409).json({ error: "That time has just been taken. Choose another." });
    }
    const visit = {
      id: `APT-${String(visits.length + 1).padStart(4, "0")}`,
      serviceId: service.id, service: service.name, vendor: service.vendor, vendorId: service.vendorId, district: service.district,
      kind: categoryById.get(service.category).visit, date, time, name: customer.name, customerId: customer.id,
      status: "Requested", createdAt: now(),
    };
    await write("appointments", [...visits, visit]);
    await notify({ to: `vendor:${service.vendorId}`, text: `${customer.name} asks for a ${visit.kind.toLowerCase()} on ${date} at ${time}. Approve or decline it.`, link: "/vendor" });
    res.status(201).json(visit);
  }));

  app.get("/api/appointments", safe(async (req, res) => {
    const ids = String(req.query.ids ?? "").split(",").filter(Boolean).slice(0, 50);
    const visits = (await loadVisits()).filter((v) => ids.includes(v.id));
    const allowed = [];
    for (const visit of visits) if (await mayUse(req, visit)) allowed.push(visit);
    res.json(allowed);
  }));

  app.post("/api/appointments/:id/cancel", safe(async (req, res) => {
    const visits = await loadVisits();
    const visit = visits.find((v) => v.id === req.params.id);
    if (!visit || !(await mayUse(req, visit))) return res.status(404).json({ error: "We could not find that appointment." });
    const cancelled = { ...visit, status: "Cancelled" };
    await write("appointments", visits.map((v) => (v.id === visit.id ? cancelled : v)));
    await notify({ to: `vendor:${visit.vendorId}`, text: `${visit.name} cancelled the ${visit.kind.toLowerCase()} on ${visit.date} at ${visit.time}.`, link: "/vendor" });
    res.json(cancelled);
  }));
}
