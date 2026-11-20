// The vendor and admin interfaces, and customer reviews.
//
// Vendors (workflow B): a business taps "List my business" and gives its details and contacts,
// uploads proof (a registration certificate or national ID) and photos of past work, adds its
// services with prices, discounts and the days it cannot work, accepts the vendor agreement and
// submits. The admin approves (the listing goes live) or rejects with a reason (the vendor fixes
// it and submits again). Once approved, the vendor accepts or declines bookings within 24 hours,
// marks them delivered, keeps a calendar, answers messages and complaints, and is paid.
//
// Signing in: vendors use their business name and a password; the admin uses a password. Set
// ADMIN_PASSWORD (and ideally SESSION_SECRET) on the host. Without ADMIN_PASSWORD the site runs in
// demo mode: the admin and the sample vendors use the published demo passwords below.
import crypto from "node:crypto";
import { checkPassword, claimsOf, hashPassword, makeToken, same, tooManyAttempts, verifyHuman } from "./auth.js";
import { addCustomers, mayUse } from "./customers.js";
import { CATEGORIES, cleanPlace, isPlace } from "./data.js";
import { normaliseChoices } from "./options.js";
import { unavailable } from "./availability.js";
import { hideContacts, isDate, notify, now, safe, today } from "./core.js";
import { describeUploads, ownedBy } from "./uploads.js";
import { read, write } from "./store.js";
import { allInOf, dueOf, loadBookings, loadCases, notificationsFor, resolveCase, updateBooking, vendorCancels } from "./orders.js";
import { loadBusy, loadBusyByVendor, loadCatalogue, loadOwnServices, loadReviews, loadVendors, saveOwnServices, saveVendor, servicesOf, slug } from "./vendors.js";

export const DEMO = !process.env.ADMIN_PASSWORD;
export const DEMO_ADMIN_PASSWORD = "celebrate-admin";
export const DEMO_VENDOR_PASSWORD = "celebrate-vendor";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEMO_ADMIN_PASSWORD;
export const AGREEMENT_VERSION = "2026-11";

// Kept here so tests and older imports keep working.
export { checkPassword, hashPassword, makeToken, readToken } from "./auth.js";

const publicVendor = ({ passHash, ...vendor }) => ({ ...vendor, hasPassword: Boolean(passHash) || (DEMO && vendor.sample) });
const UNITS = ["day", "event", "plate", "guest", "set", "tent", "cake", "table", "gown", "suit", "pair", "show", "booth", "hour", "outfit", "dress"];
const QTY_RULES = ["flat", "perGuest", "per100Guests", "perTent"];

/** What a vendor still has to do before their application can be sent. */
async function missingSteps(vendor) {
  const own = (await loadOwnServices()).filter((s) => s.vendorId === vendor.id && !s.removed);
  const missing = [];
  if (!vendor.contacts?.phone) missing.push("details");
  if (!vendor.proofs?.certificate && !vendor.proofs?.nationalId) missing.push("proof");
  if (!vendor.workPhotos?.length) missing.push("photos");
  if (!own.length && !vendor.sample) missing.push("services");
  if (vendor.agreement?.version !== AGREEMENT_VERSION) missing.push("agreement");
  return missing;
}

/** Checks and tidies a vendor's own service. Returns { service } or { error }. */
function readService(body, vendor) {
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const price = Math.round(Number(body?.price));
  const wasPrice = body?.wasPrice ? Math.round(Number(body.wasPrice)) : null;
  const amount = (value, most) => {
    const n = Math.round(Number(value || 0));
    return Number.isFinite(n) && n >= 0 && n <= most ? n : null;
  };
  if (name.length < 3) return { error: "Give the service a name." };
  if (!CATEGORIES.some((c) => c.id === body?.category)) return { error: "Choose what kind of service it is." };
  if (!Number.isFinite(price) || price < 1000 || price > 500000000) return { error: "Enter a price from UGX 1,000." };
  if (wasPrice !== null && (!Number.isFinite(wasPrice) || wasPrice <= price)) return { error: "A discount's old price must be higher than the new price." };
  if (!UNITS.includes(body?.unit)) return { error: "Choose what the price is for." };
  if (!QTY_RULES.includes(body?.qtyRule)) return { error: "Choose how the quantity is worked out." };
  const labour = amount(body?.labour, 50000000);
  const labourPerQty = amount(body?.labourPerQty, 50000000);
  const transport = amount(body?.transport, 50000000);
  if ([labour, labourPerQty, transport].includes(null)) return { error: "Enter labour and transport as amounts in shillings." };
  const included = (Array.isArray(body?.included) ? body.included : String(body?.included ?? "").split("\n"))
    .map((line) => hideContacts(String(line)).trim().slice(0, 120)).filter(Boolean).slice(0, 8);
  return {
    service: {
      vendorId: vendor.id, category: body.category, name: hideContacts(name), price, wasPrice, unit: body.unit, qtyRule: body.qtyRule,
      summary: hideContacts(String(body?.summary ?? "")).trim().slice(0, 40), included, labour, labourPerQty, transport,
      district: vendor.district, photoIds: Array.isArray(body?.photoIds) ? body.photoIds.map(String).slice(0, 6) : [],
    },
  };
}

export function addStaff(app) {
  // `allow` is the list of vendor statuses a route accepts.
  const role = (wanted, allow = ["approved"]) => (handler) =>
    safe(async (req, res) => {
      const claims = claimsOf(req);
      if (!claims || claims.role !== wanted) return res.status(401).json({ error: "Please sign in again." });
      if (wanted === "vendor") {
        const vendor = (await loadVendors()).find((v) => v.id === claims.vendor);
        if (!vendor || vendor.status === "suspended") return res.status(403).json({ error: "This vendor account is not active. Contact Celebrate." });
        if (!allow.includes(vendor.status)) return res.status(403).json({ error: vendor.status === "approved" ? "Your business is already approved." : "Your business has not been approved yet." });
        req.vendor = vendor;
      }
      return handler(req, res);
    });
  const asVendor = role("vendor");
  const asApplicant = role("vendor", ["draft", "pending", "rejected", "approved"]);
  const editing = role("vendor", ["draft", "rejected", "approved"]);
  const asAdmin = role("admin");
  addCustomers(app, { safe, loadBookings, asAdmin });

  // ---- B1: applying, and signing in

  app.post("/api/vendors/apply", safe(async (req, res) => {
    const body = req.body ?? {};
    const name = String(body.business ?? "").trim().slice(0, 60);
    const owner = String(body.owner ?? "").trim().slice(0, 60);
    const about = String(body.about ?? "").trim().slice(0, 400);
    const password = String(body.password ?? "");
    const phone = String(body.phone ?? "").replace(/[\s().-]/g, "");
    const email = String(body.email ?? "").trim().slice(0, 120);
    if (name.length < 3) return res.status(400).json({ error: "Enter your business name." });
    if (!owner) return res.status(400).json({ error: "Enter the owner's name." });
    if (!CATEGORIES.some((c) => c.id === body.category)) return res.status(400).json({ error: "Choose what your business does." });
    if (!isPlace(cleanPlace(body.district))) return res.status(400).json({ error: "Choose your district, or type your area." });
    if (!/^(?:\+?256|0)7\d{8}$/.test(phone)) return res.status(400).json({ error: "Enter a business phone number, like 0770 123 456." });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "That email address does not look right." });
    if (password.length < 8) return res.status(400).json({ error: "Choose a password of at least 8 characters." });
    const human = await verifyHuman(body.token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    const vendors = await loadVendors();
    if (vendors.some((v) => v.id === slug(name))) return res.status(409).json({ error: "A business with that name is already registered. Sign in, or contact Celebrate." });
    if (vendors.filter((v) => ["draft", "pending"].includes(v.status)).length >= 300) return res.status(429).json({ error: "We are not taking applications right now. Please try later." });
    const vendor = await saveVendor({
      id: slug(name), name, owner, about, category: body.category, district: cleanPlace(body.district),
      contacts: { phone, email }, proofs: {}, workPhotos: [], agreement: null,
      status: "draft", verified: false, sample: false, passHash: hashPassword(password), createdAt: now(),
    });
    res.status(201).json({ token: makeToken({ role: "vendor", vendor: vendor.id }), role: "vendor", vendor: publicVendor(vendor) });
  }));

  app.post("/api/staff/login", safe(async (req, res) => {
    const { role: wanted, name, password, token } = req.body ?? {};
    const key = `${req.ip}:${wanted}:${slug(String(name ?? ""))}`;
    if (tooManyAttempts(key)) return res.status(429).json({ error: "Too many attempts. Wait ten minutes and try again." });
    const human = await verifyHuman(token);
    if (human.error) return res.status(human.status).json({ error: human.error });

    if (wanted === "admin") {
      if (!same(password, ADMIN_PASSWORD)) return res.status(401).json({ error: "That password is not right." });
      return res.json({ token: makeToken({ role: "admin" }), role: "admin" });
    }
    if (wanted === "vendor") {
      const vendor = (await loadVendors()).find((v) => v.id === slug(String(name ?? "")));
      const ok = vendor && (checkPassword(String(password ?? ""), vendor.passHash) || (DEMO && vendor.sample && !vendor.passHash && same(password, DEMO_VENDOR_PASSWORD)));
      if (!ok) return res.status(401).json({ error: "That business name and password do not match." });
      if (vendor.status === "suspended") return res.status(403).json({ error: "This vendor account is not active. Contact Celebrate." });
      return res.json({ token: makeToken({ role: "vendor", vendor: vendor.id }), role: "vendor", vendor: publicVendor(vendor) });
    }
    res.status(400).json({ error: "Choose how you are signing in." });
  }));

  // ---- B1 to B5: the application

  async function application(vendor) {
    const own = (await loadOwnServices()).filter((s) => s.vendorId === vendor.id && !s.removed);
    return {
      vendor: publicVendor(vendor),
      proofs: {
        certificate: (await describeUploads([vendor.proofs?.certificate].filter(Boolean)))[0] ?? null,
        nationalId: (await describeUploads([vendor.proofs?.nationalId].filter(Boolean)))[0] ?? null,
      },
      workPhotos: await describeUploads(vendor.workPhotos ?? []),
      services: own,
      agreementVersion: AGREEMENT_VERSION,
      busy: (await loadBusyByVendor())[vendor.id] ?? [],
      categories: CATEGORIES.map(({ id, title }) => ({ id, title })),
      units: UNITS, qtyRules: QTY_RULES,
      missing: await missingSteps(vendor),
    };
  }

  app.get("/api/vendor/application", asApplicant(async (req, res) => res.json(await application(req.vendor))));

  app.post("/api/vendor/application", editing(async (req, res) => {
    const body = req.body ?? {};
    const phone = String(body.phone ?? req.vendor.contacts?.phone ?? "").replace(/[\s().-]/g, "");
    const email = String(body.email ?? req.vendor.contacts?.email ?? "").trim().slice(0, 120);
    if (!/^(?:\+?256|0)7\d{8}$/.test(phone)) return res.status(400).json({ error: "Enter a business phone number, like 0770 123 456." });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "That email address does not look right." });
    if (body.category && !CATEGORIES.some((c) => c.id === body.category)) return res.status(400).json({ error: "Choose what your business does." });
    if (body.district && !isPlace(cleanPlace(body.district))) return res.status(400).json({ error: "Choose your district, or type your area." });
    const vendor = await saveVendor({
      ...req.vendor,
      owner: String(body.owner ?? req.vendor.owner).trim().slice(0, 60) || req.vendor.owner,
      about: String(body.about ?? req.vendor.about ?? "").trim().slice(0, 400),
      category: body.category ?? req.vendor.category, district: body.district ? cleanPlace(body.district) : req.vendor.district,
      contacts: { phone, email },
    });
    res.json(await application(vendor));
  }));

  app.post("/api/vendor/application/documents", editing(async (req, res) => {
    const owner = `vendor:${req.vendor.id}`;
    const [certificate] = await ownedBy([req.body?.certificate].filter(Boolean), owner);
    const [nationalId] = await ownedBy([req.body?.nationalId].filter(Boolean), owner);
    const workPhotos = await ownedBy(Array.isArray(req.body?.workPhotos) ? req.body.workPhotos.slice(0, 12) : [], owner);
    const vendor = await saveVendor({
      ...req.vendor,
      proofs: { certificate: certificate ?? req.vendor.proofs?.certificate ?? null, nationalId: nationalId ?? req.vendor.proofs?.nationalId ?? null },
      workPhotos: req.body?.workPhotos ? workPhotos : req.vendor.workPhotos ?? [],
    });
    res.json(await application(vendor));
  }));

  app.post("/api/vendor/application/agreement", editing(async (req, res) => {
    const signedBy = String(req.body?.name ?? "").trim().slice(0, 60);
    if (req.body?.accept !== true) return res.status(400).json({ error: "Tick the box to accept the vendor agreement." });
    if (signedBy.length < 3) return res.status(400).json({ error: "Type your full name to sign." });
    const vendor = await saveVendor({ ...req.vendor, agreement: { version: AGREEMENT_VERSION, at: now(), name: signedBy } });
    res.json(await application(vendor));
  }));

  app.post("/api/vendor/application/submit", role("vendor", ["draft", "rejected"])(async (req, res) => {
    const missing = await missingSteps(req.vendor);
    if (missing.length) return res.status(400).json({ error: `Finish these steps first: ${missing.join(", ")}.`, missing });
    const vendor = await saveVendor({ ...req.vendor, status: "pending", submittedAt: now() });
    await notify({ to: "admin", text: `${vendor.name} has applied to be listed. Check their documents.`, link: "/admin" });
    res.json(await application(vendor));
  }));

  // ---- B3: services a vendor offers (while applying, and once approved)

  app.post("/api/vendor/services", editing(async (req, res) => {
    const { service, error } = readService(req.body, req.vendor);
    if (error) return res.status(400).json({ error });
    service.photoIds = await ownedBy(service.photoIds, `vendor:${req.vendor.id}`);
    const list = await loadOwnServices();
    const existing = req.body?.id && list.find((s) => s.id === req.body.id && s.vendorId === req.vendor.id);
    if (req.body?.id && !existing) return res.status(404).json({ error: "We could not find that service." });
    if (!existing && list.filter((s) => s.vendorId === req.vendor.id && !s.removed).length >= 30) return res.status(400).json({ error: "You can list up to 30 services." });
    const saved = existing
      ? { ...existing, ...service, updatedAt: now() }
      : { ...service, id: `v-${req.vendor.id}-${crypto.randomBytes(3).toString("hex")}`, createdAt: now() };
    await saveOwnServices(existing ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved]);
    res.status(existing ? 200 : 201).json(saved);
  }));

  // Removed services stay on record so existing bookings still show them.
  app.post("/api/vendor/services/:id/remove", editing(async (req, res) => {
    const list = await loadOwnServices();
    const existing = list.find((s) => s.id === req.params.id && s.vendorId === req.vendor.id);
    if (!existing) return res.status(404).json({ error: "We could not find that service." });
    await saveOwnServices(list.map((s) => (s.id === existing.id ? { ...s, removed: true } : s)));
    res.json({ ok: true });
  }));

  // ---- The vendor workspace

  app.get("/api/vendor/overview", asVendor(async (req, res) => {
    const catalogue = await loadCatalogue();
    const services = servicesOf(req.vendor, catalogue);
    const mine = new Set(services.map((s) => s.id));
    const all = await loadBookings();
    const relevant = all.filter((b) => b.status !== "awaiting_payment" && b.quote.lines.some((line) => mine.has(line.id)));
    const bookings = relevant.map((booking) => ({
      id: booking.id, createdAt: booking.createdAt, customer: booking.customer, event: booking.event, status: booking.status,
      paidInFull: !booking.balance, cancellation: booking.cancellation ?? null,
      lines: booking.quote.lines.filter((line) => mine.has(line.id)).map((line) => {
        const v = booking.vendors.find((x) => x.serviceId === line.id) ?? {};
        return {
          ...line, status: v.status ?? "Waiting", respondBy: v.respondBy, overdue: v.status === "Waiting" && v.respondBy && v.respondBy < now(),
          deliveredAt: v.deliveredAt, confirmedAt: v.confirmedAt, autoConfirmed: v.autoConfirmed, hold: v.hold ?? null,
          payout: v.payout, cancelled: v.cancelled ?? null, due: dueOf(booking, line.id),
        };
      }),
    }));
    const messages = {};
    for (const booking of bookings) messages[booking.id] = (await read(`messages:${booking.id}`, [])).filter((m) => mine.has(m.serviceId));
    const cases = [];
    for (const record of (await loadCases()).filter((c) => c.vendorId === req.vendor.id)) {
      cases.push({ ...record, evidence: await describeUploads(record.evidence), response: record.response && { ...record.response, evidence: await describeUploads(record.response.evidence) } });
    }
    const myLines = relevant.filter((b) => b.status === "active").map((b) => ({ ...b, vendors: b.vendors.filter((v) => mine.has(v.serviceId)) }));
    res.json({
      vendor: publicVendor(req.vendor),
      services: services.map(({ id, name, price, wasPrice, unit, category, own, rating, reviews }) => ({ id, name, price, wasPrice, unit, category, own: Boolean(own), rating, reviews })),
      bookings, messages, cases,
      visits: (await read("appointments", [])).filter((visit) => mine.has(visit.serviceId)),
      reviews: (await loadReviews()).filter((review) => mine.has(review.serviceId)),
      busy: (await loadBusyByVendor())[req.vendor.id] ?? [],
      notifications: await notificationsFor(`vendor:${req.vendor.id}`, myLines, () => "/vendor"),
    });
  }));

  app.post("/api/vendor/busy", editing(async (req, res) => {
    const date = String(req.body?.date ?? "");
    if (!isDate(date) || date < today()) return res.status(400).json({ error: "Choose a date that has not passed." });
    const all = await loadBusyByVendor();
    const mine = new Set(all[req.vendor.id] ?? []);
    if (req.body?.busy) mine.add(date);
    else mine.delete(date);
    const next = [...mine].sort().slice(-400);
    await write("busy", { ...all, [req.vendor.id]: next });
    res.json(next);
  }));

  /** The booking and this vendor's line on it, or an error response. */
  async function myLine(req, res, serviceId) {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    const line = booking?.vendors.find((v) => v.serviceId === serviceId && v.vendorId === req.vendor.id);
    if (!line) return res.status(404).json({ error: "We could not find that booking." }), null;
    if (booking.status !== "active") return res.status(400).json({ error: "This booking is not active." }), null;
    return { booking, line };
  }

  // E1: accept within 24 hours, or decline with a reason (which opens a case for the admin).
  app.post("/api/vendor/bookings/:id/status", asVendor(async (req, res) => {
    const serviceId = String(req.body?.serviceId ?? "");
    const found = await myLine(req, res, serviceId);
    if (!found) return;
    const { booking, line } = found;
    if (req.body?.status === "Confirmed") {
      if (line.status !== "Waiting") return res.status(400).json({ error: "This booking has already been answered." });
      line.status = "Confirmed";
      line.acceptedAt = now();
      await updateBooking(booking);
      await notify({ to: `customer:${booking.customerId}`, text: `${line.vendor} has accepted ${booking.id}.`, link: `/receipt/${booking.id}` });
      return res.json({ ok: true });
    }
    if (req.body?.status === "Declined") {
      const reason = hideContacts(String(req.body?.reason ?? "")).trim().slice(0, 300);
      if (!reason) return res.status(400).json({ error: "Give the customer a reason." });
      if (!["Waiting", "Confirmed"].includes(line.status)) return res.status(400).json({ error: "This booking can no longer be declined." });
      await vendorCancels(booking, serviceId, reason, "vendor");
      return res.json({ ok: true });
    }
    res.status(400).json({ error: "Choose accept or decline." });
  }));

  // F1: a vendor cancels a booking they had accepted.
  app.post("/api/vendor/bookings/:id/lines/:serviceId/cancel", asVendor(async (req, res) => {
    const found = await myLine(req, res, req.params.serviceId);
    if (!found) return;
    const reason = hideContacts(String(req.body?.reason ?? "")).trim().slice(0, 300);
    if (!reason) return res.status(400).json({ error: "Give the customer a reason." });
    if (!["Waiting", "Confirmed"].includes(found.line.status)) return res.status(400).json({ error: "This booking can no longer be cancelled." });
    if (found.booking.event.date < today()) return res.status(400).json({ error: "The event has passed." });
    await vendorCancels(found.booking, req.params.serviceId, reason, "vendor");
    res.json({ ok: true });
  }));

  // E3: the vendor marks the service delivered, on the day or after.
  app.post("/api/vendor/bookings/:id/lines/:serviceId/delivered", asVendor(async (req, res) => {
    const found = await myLine(req, res, req.params.serviceId);
    if (!found) return;
    const { booking, line } = found;
    if (line.status !== "Confirmed") return res.status(400).json({ error: "Only an accepted booking can be marked delivered." });
    if (booking.event.date > today()) return res.status(400).json({ error: `You can mark this delivered on the day, ${booking.event.date}.` });
    if (line.deliveredAt) return res.status(400).json({ error: "Already marked delivered." });
    line.deliveredAt = now();
    await updateBooking(booking);
    await notify({ to: `customer:${booking.customerId}`, text: `${line.vendor} has marked their part of ${booking.id} delivered. Confirm it, or report a problem, within 48 hours.`, link: `/receipt/${booking.id}` });
    res.json({ ok: true });
  }));

  app.post("/api/vendor/visits/:id", asVendor(async (req, res) => {
    const status = req.body?.status;
    if (!["Confirmed", "Declined"].includes(status)) return res.status(400).json({ error: "Choose confirm or decline." });
    const catalogue = await loadCatalogue();
    const visits = await read("appointments", []);
    const visit = visits.find((v) => v.id === req.params.id);
    if (!visit || !servicesOf(req.vendor, catalogue).some((s) => s.id === visit.serviceId)) return res.status(404).json({ error: "We could not find that appointment." });
    if (visit.status === "Cancelled") return res.status(400).json({ error: "The customer has cancelled this appointment." });
    await write("appointments", visits.map((v) => (v.id === visit.id ? { ...v, status } : v)));
    await notify({ to: `customer:${visit.customerId}`, text: `${visit.vendor} has ${status === "Confirmed" ? "confirmed" : "declined"} your ${visit.kind.toLowerCase()} on ${visit.date} at ${visit.time}.`, link: "/bookings#visits" });
    res.json({ ok: true });
  }));

  app.post("/api/vendor/bookings/:id/messages", asVendor(async (req, res) => {
    const serviceId = String(req.body?.serviceId ?? "");
    const raw = String(req.body?.text ?? "").trim();
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking?.vendors.some((v) => v.serviceId === serviceId && v.vendorId === req.vendor.id)) return res.status(404).json({ error: "We could not find that booking." });
    if (!raw) return res.status(400).json({ error: "Write a message first." });
    if (raw.length > 500) return res.status(400).json({ error: "Keep messages under 500 characters." });
    const text = hideContacts(raw);
    const all = await read(`messages:${booking.id}`, []);
    if (all.length >= 300) return res.status(400).json({ error: "This booking has reached its message limit." });
    const next = [...all, { serviceId, from: "vendor", text, hidden: text !== raw, at: now() }];
    await write(`messages:${booking.id}`, next);
    await notify({ to: `customer:${booking.customerId}`, text: `New message from ${req.vendor.name} about ${booking.id}.`, link: `/receipt/${booking.id}` });
    res.status(201).json(next.filter((m) => m.serviceId === serviceId));
  }));

  // F4: the vendor's side of a complaint, with evidence.
  app.post("/api/vendor/cases/:id/respond", asVendor(async (req, res) => {
    const cases = await loadCases();
    const record = cases.find((c) => c.id === req.params.id && c.vendorId === req.vendor.id);
    if (!record || record.type !== "complaint" || record.status !== "open") return res.status(404).json({ error: "We could not find an open complaint." });
    const text = hideContacts(String(req.body?.text ?? "")).trim().slice(0, 1000);
    if (text.length < 10) return res.status(400).json({ error: "Tell us your side, in a sentence or two." });
    const evidence = await ownedBy(Array.isArray(req.body?.evidence) ? req.body.evidence.slice(0, 6) : [], `vendor:${req.vendor.id}`);
    const { addReaders } = await import("./uploads.js");
    await addReaders(evidence, record.customerId ? [`customer:${record.customerId}`] : []);
    record.response = { text, evidence, at: now() };
    await write("cases", cases);
    await notify({ to: "admin", text: `${req.vendor.name} has answered complaint ${record.id}.`, link: "/admin" });
    res.json(record);
  }));

  // ---- Reviews

  app.get("/api/services/:id/reviews", safe(async (req, res) => {
    res.json((await loadReviews()).filter((review) => review.serviceId === req.params.id).map(({ bookingId, ...review }) => review));
  }));

  // A host may review a vendor once per booking, once the event has happened or the booking is paid in full.
  app.post("/api/bookings/:id/reviews", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return res.status(403).json({ error: "Only the account that made this booking can review it." });
    const serviceId = String(req.body?.serviceId ?? "");
    const line = booking.quote.lines.find((l) => l.id === serviceId);
    const status = booking.vendors.find((v) => v.serviceId === serviceId)?.status;
    if (!line) return res.status(400).json({ error: "That vendor is not on this booking." });
    if (booking.status !== "active" || status !== "Confirmed") return res.status(403).json({ error: "You can only review a vendor who took part in your event." });
    const rating = Number(req.body?.rating);
    const text = hideContacts(String(req.body?.text ?? "").trim()).slice(0, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Choose from 1 to 5 stars." });
    if (booking.balance && booking.event.date > today()) {
      return res.status(403).json({ error: "You can review a vendor once the event has happened or the balance is paid." });
    }
    const reviews = await loadReviews();
    if (reviews.some((r) => r.bookingId === booking.id && r.serviceId === serviceId)) return res.status(409).json({ error: "You have already reviewed this vendor for this booking." });
    const review = {
      id: `REV-${String(reviews.length + 1).padStart(4, "0")}-${crypto.randomBytes(2).toString("hex")}`,
      bookingId: booking.id, serviceId, vendor: line.vendor, service: line.name,
      rating, text, name: (booking.customer || "A customer").split(" ")[0], eventType: booking.event.type, at: now(),
    };
    await write("reviews", [...reviews, review]);
    res.status(201).json(review);
  }));

  // ---- Admin

  app.get("/api/admin/overview", asAdmin(async (_req, res) => {
    const [bookings, vendors, visits, reviews, catalogue, cases] = await Promise.all([
      loadBookings(), loadVendors(), read("appointments", []), loadReviews(), loadCatalogue(), loadCases(),
    ]);
    const live = bookings.filter((b) => b.status !== "awaiting_payment");
    const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
    const refundsOf = (b) => sum(b.refunds ?? [], (r) => r.amount);
    const payouts = live.flatMap((booking) =>
      booking.vendors.map((v) => ({
        bookingId: booking.id, serviceId: v.serviceId, vendor: v.vendor, vendorId: v.vendorId,
        service: booking.quote.lines.find((l) => l.id === v.serviceId)?.name ?? "", eventDate: booking.event.date,
        status: v.status, respondBy: v.respondBy, overdue: booking.status === "active" && v.status === "Waiting" && v.respondBy && v.respondBy < now(),
        deliveredAt: v.deliveredAt ?? null, confirmedAt: v.confirmedAt ?? null, autoConfirmed: Boolean(v.autoConfirmed), hold: v.hold ?? null,
        due: ["Waiting", "Confirmed"].includes(v.status) && booking.status === "active" ? dueOf(booking, v.serviceId) : 0,
        payout: v.payout ?? { status: "waiting" },
      }))
    );
    const described = [];
    for (const record of cases) {
      described.push({
        ...record,
        evidence: await describeUploads(record.evidence),
        response: record.response && { ...record.response, evidence: await describeUploads(record.response.evidence) },
        allIn: (() => {
          const b = bookings.find((x) => x.id === record.bookingId);
          return b ? allInOf(b, record.serviceId) : 0;
        })(),
      });
    }
    res.json({
      demo: DEMO,
      totals: {
        bookings: live.filter((b) => b.status !== "cancelled").length,
        cancelled: live.filter((b) => b.status === "cancelled").length,
        value: sum(live.filter((b) => b.status !== "cancelled"), (b) => b.total),
        collected: sum(live, (b) => b.paid),
        refunded: sum(live, refundsOf),
        outstanding: sum(live, (b) => b.balance ?? 0),
        fees: sum(live.filter((b) => b.status !== "cancelled"), (b) => b.quote.platformFee),
        owedToVendors: sum(payouts.filter((p) => p.payout.status !== "paid"), (p) => p.due),
        paidToVendors: sum(payouts.filter((p) => p.payout.status === "paid"), (p) => p.payout.amount),
        openCases: cases.filter((c) => c.status === "open").length,
        overdue: payouts.filter((p) => p.overdue).length,
      },
      vendors: vendors.map((vendor) => {
        const ids = new Set(servicesOf(vendor, catalogue).map((s) => s.id));
        const lines = payouts.filter((p) => ids.has(p.serviceId));
        const theirReviews = reviews.filter((r) => ids.has(r.serviceId));
        return {
          ...publicVendor(vendor),
          services: [...ids].filter((sid) => catalogue.byId.get(sid)).length,
          bookings: lines.length,
          waiting: lines.filter((p) => p.status === "Waiting").length,
          overdue: lines.filter((p) => p.overdue).length,
          declined: lines.filter((p) => ["Declined", "Cancelled"].includes(p.status) && bookings.find((b) => b.id === p.bookingId)?.vendors.find((v) => v.serviceId === p.serviceId)?.cancelled?.by !== "customer").length,
          complaints: cases.filter((c) => c.vendorId === vendor.id && c.type === "complaint").length,
          visitsWaiting: visits.filter((v) => ids.has(v.serviceId) && v.status === "Requested").length,
          rating: theirReviews.length ? Math.round((sum(theirReviews, (r) => r.rating) / theirReviews.length) * 10) / 10 : null,
          reviews: theirReviews.length,
        };
      }),
      bookings: live.map((b) => ({
        id: b.id, createdAt: b.createdAt, customer: b.customer, event: b.event, status: b.status, total: b.total, paid: b.paid,
        balance: b.balance ?? 0, refunded: refundsOf(b), method: b.method, balanceMethod: b.balanceMethod, fee: b.quote.platformFee,
        payments: b.payments ?? [], refunds: b.refunds ?? [], cancellation: b.cancellation ?? null,
      })),
      payouts, visits, reviews, cases: described,
    });
  }));

  app.get("/api/admin/applications", asAdmin(async (_req, res) => {
    const vendors = (await loadVendors()).filter((v) => ["pending", "rejected", "draft"].includes(v.status));
    const own = await loadOwnServices();
    const list = [];
    for (const vendor of vendors) {
      list.push({
        ...publicVendor(vendor),
        proofs: {
          certificate: (await describeUploads([vendor.proofs?.certificate].filter(Boolean)))[0] ?? null,
          nationalId: (await describeUploads([vendor.proofs?.nationalId].filter(Boolean)))[0] ?? null,
        },
        workPhotos: await describeUploads(vendor.workPhotos ?? []),
        services: own.filter((s) => s.vendorId === vendor.id && !s.removed),
        missing: await missingSteps(vendor),
      });
    }
    res.json(list);
  }));

  app.post("/api/admin/vendors", asAdmin(async (req, res) => {
    const body = req.body ?? {};
    const name = String(body.business ?? "").trim().slice(0, 60);
    const password = String(body.password ?? "");
    if (name.length < 3) return res.status(400).json({ error: "Enter the business name." });
    if (!CATEGORIES.some((c) => c.id === body.category)) return res.status(400).json({ error: "Choose what the business does." });
    if (!isPlace(cleanPlace(body.district))) return res.status(400).json({ error: "Choose the district, or type the area." });
    if (password.length < 8) return res.status(400).json({ error: "Give a starting password of at least 8 characters." });
    if ((await loadVendors()).some((v) => v.id === slug(name))) return res.status(409).json({ error: "A business with that name already exists." });
    const vendor = await saveVendor({
      id: slug(name), name, owner: String(body.owner ?? "").trim().slice(0, 60), about: "", category: body.category, district: cleanPlace(body.district),
      contacts: {}, proofs: {}, workPhotos: [], status: "approved", verified: true, sample: false, passHash: hashPassword(password), createdAt: now(),
    });
    res.status(201).json(publicVendor(vendor));
  }));

  app.post("/api/admin/vendors/:id", asAdmin(async (req, res) => {
    const vendor = (await loadVendors()).find((v) => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ error: "We could not find that vendor." });
    const { action, password } = req.body ?? {};
    if (action === "password") {
      if (String(password ?? "").length < 8) return res.status(400).json({ error: "Give a password of at least 8 characters." });
      return res.json(publicVendor(await saveVendor({ ...vendor, passHash: hashPassword(String(password)) })));
    }
    if (action === "reject") {
      const reason = String(req.body?.reason ?? "").trim().slice(0, 500);
      if (reason.length < 5) return res.status(400).json({ error: "Tell the vendor why, so they can fix it." });
      const saved = await saveVendor({ ...vendor, status: "rejected", review: { decision: "rejected", reason, at: now() } });
      return res.json(publicVendor(saved));
    }
    const changes = {
      approve: { status: "approved", verified: true, review: { decision: "approved", at: now() } },
      suspend: { status: "suspended" },
      restore: { status: "approved" },
      verify: { verified: true },
      unverify: { verified: false },
    }[action];
    if (!changes) return res.status(400).json({ error: "That action is not known." });
    if (action === "approve" && vendor.status !== "pending") return res.status(400).json({ error: "Only a submitted application can be approved." });
    res.json(publicVendor(await saveVendor({ ...vendor, ...changes })));
  }));

  // F3: what the admin can offer when a vendor cancels: others of the same kind, free that day.
  app.get("/api/admin/cases/:id/replacements", asAdmin(async (req, res) => {
    const record = (await loadCases()).find((c) => c.id === req.params.id);
    if (!record) return res.status(404).json({ error: "We could not find that case." });
    const catalogue = await loadCatalogue();
    const bookings = await loadBookings();
    const booking = bookings.find((b) => b.id === record.bookingId);
    const old = catalogue.byId.get(record.serviceId);
    const busy = await loadBusy(catalogue);
    const list = catalogue.visible
      .filter((s) => s.category === old?.category && !booking.quote.lines.some((l) => l.id === s.id))
      .filter((s) => !unavailable([s.id], booking.event.date, bookings, busy).length)
      .map((s) => ({ id: s.id, name: s.name, vendor: s.vendor, district: s.district, rating: s.rating, price: s.price, unit: s.unit, sameChoices: normaliseChoices(s.category, booking.choices?.[old.id]) }));
    res.json(list);
  }));

  app.post("/api/admin/cases/:id/resolve", asAdmin(async (req, res) => {
    const result = await resolveCase(req.params.id, req.body ?? {}, await loadCatalogue());
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.case);
  }));

  // A vendor who has not answered within 24 hours: the admin treats it as a cancellation.
  app.post("/api/admin/bookings/:id/lines/:serviceId/no-response", asAdmin(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    const line = booking?.vendors.find((v) => v.serviceId === req.params.serviceId);
    if (!line) return res.status(404).json({ error: "We could not find that booking." });
    if (line.status !== "Waiting" || !line.respondBy || line.respondBy > now()) return res.status(400).json({ error: "This vendor still has time to answer." });
    res.json(await vendorCancels(booking, line.serviceId, "The vendor did not answer within 24 hours.", "admin"));
  }));

  app.post("/api/admin/reviews/:id/remove", asAdmin(async (req, res) => {
    const reviews = await loadReviews();
    if (!reviews.some((r) => r.id === req.params.id)) return res.status(404).json({ error: "We could not find that review." });
    await write("reviews", reviews.filter((r) => r.id !== req.params.id));
    res.json({ ok: true });
  }));

}
