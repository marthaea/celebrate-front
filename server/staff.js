// The vendor and admin interfaces, and customer reviews.
//
// Signing in: vendors use their business name and a password; the admin uses a password.
// A successful sign-in returns a signed token that the browser sends back with each request.
// Set ADMIN_PASSWORD (and ideally SESSION_SECRET) on the host. Without ADMIN_PASSWORD the site
// runs in demo mode: the admin and the sample vendors use the published demo passwords below.
import crypto from "node:crypto";
import { checkPassword, claimsOf, hashPassword, makeToken, same, tooManyAttempts, verifyHuman } from "./auth.js";
import { addCustomers, mayUse } from "./customers.js";
import { CATEGORIES, DISTRICTS, SERVICES } from "./data.js";
import { buildQuote } from "./pricing.js";
import { hideContacts } from "./extras.js";
import { read, write } from "./store.js";
import { hiddenServiceIds, loadBusyByVendor, loadReviews, loadVendors, saveVendor, servicesOf, slug } from "./vendors.js";

export const DEMO = !process.env.ADMIN_PASSWORD;
export const DEMO_ADMIN_PASSWORD = "celebrate-admin";
export const DEMO_VENDOR_PASSWORD = "celebrate-vendor";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEMO_ADMIN_PASSWORD;

// Kept here so tests and older imports keep working.
export { checkPassword, hashPassword, makeToken, readToken } from "./auth.js";

const isDate = (text) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
const publicVendor = ({ passHash, ...vendor }) => ({ ...vendor, hasPassword: Boolean(passHash) || (DEMO && vendor.sample) });

/** What a vendor is owed for one service on a booking: its price, labour and transport, without our fee. */
function dueFor(booking, serviceId) {
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!service) return 0;
  const quote = buildQuote([service], booking.event);
  return quote.itemCost + quote.labour + quote.transport;
}

export function addStaff(app, { safe, loadBookings }) {
  const role = (wanted) => (handler) =>
    safe(async (req, res) => {
      const claims = claimsOf(req);
      if (!claims || claims.role !== wanted) return res.status(401).json({ error: "Please sign in again." });
      if (wanted === "vendor") {
        const vendor = (await loadVendors()).find((v) => v.id === claims.vendor);
        if (!vendor || vendor.status !== "approved") return res.status(403).json({ error: "This vendor account is not active. Contact Celebrate." });
        req.vendor = vendor;
      }
      return handler(req, res);
    });
  const asVendor = role("vendor");
  const asAdmin = role("admin");
  addCustomers(app, { safe, loadBookings, asAdmin });

  // ---- Applying and signing in

  app.post("/api/vendors/apply", safe(async (req, res) => {
    const body = req.body ?? {};
    const name = String(body.business ?? "").trim().slice(0, 60);
    const owner = String(body.owner ?? "").trim().slice(0, 60);
    const about = String(body.about ?? "").trim().slice(0, 400);
    const password = String(body.password ?? "");
    if (name.length < 3) return res.status(400).json({ error: "Enter your business name." });
    if (!owner) return res.status(400).json({ error: "Enter the owner's name." });
    if (!CATEGORIES.some((c) => c.id === body.category)) return res.status(400).json({ error: "Choose what your business does." });
    if (!DISTRICTS.includes(body.district)) return res.status(400).json({ error: "Choose your district." });
    if (password.length < 8) return res.status(400).json({ error: "Choose a password of at least 8 characters." });
    const human = await verifyHuman(body.token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    const vendors = await loadVendors();
    if (vendors.some((v) => v.id === slug(name))) return res.status(409).json({ error: "A business with that name is already registered. Sign in, or contact Celebrate." });
    if (vendors.filter((v) => v.status === "pending").length >= 200) return res.status(429).json({ error: "We are not taking applications right now. Please try later." });
    const vendor = await saveVendor({
      id: slug(name), name, owner, about, category: body.category, district: body.district,
      status: "pending", verified: false, sample: false, passHash: hashPassword(password), createdAt: new Date().toISOString(),
    });
    res.status(201).json(publicVendor(vendor));
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
      if (vendor.status === "pending") return res.status(403).json({ error: "Your application is still being checked. We will let you in once it is approved." });
      if (vendor.status !== "approved") return res.status(403).json({ error: "This vendor account is not active. Contact Celebrate." });
      return res.json({ token: makeToken({ role: "vendor", vendor: vendor.id }), role: "vendor", vendor: publicVendor(vendor) });
    }
    res.status(400).json({ error: "Choose how you are signing in." });
  }));

  // ---- Vendor workspace

  app.get("/api/vendor/overview", asVendor(async (req, res) => {
    const mine = new Set(servicesOf(req.vendor).map((s) => s.id));
    const bookings = (await loadBookings())
      .filter((booking) => booking.quote.lines.some((line) => mine.has(line.id)))
      .map((booking) => ({
        id: booking.id, createdAt: booking.createdAt, customer: booking.customer, event: booking.event,
        depositPaid: true, paidInFull: !booking.balance,
        lines: booking.quote.lines.filter((line) => mine.has(line.id)).map((line) => ({
          ...line,
          status: booking.vendors.find((v) => v.serviceId === line.id)?.status ?? "Waiting",
          due: dueFor(booking, line.id),
          paidOut: Boolean(booking.payouts?.[line.id]),
        })),
      }));
    const messages = {};
    for (const booking of bookings) {
      messages[booking.id] = (await read(`messages:${booking.id}`, [])).filter((m) => mine.has(m.serviceId));
    }
    res.json({
      vendor: publicVendor(req.vendor),
      services: servicesOf(req.vendor).map(({ id, name, price, unit, category }) => ({ id, name, price, unit, category })),
      bookings, messages,
      visits: (await read("appointments", [])).filter((visit) => mine.has(visit.serviceId)),
      reviews: (await loadReviews()).filter((review) => mine.has(review.serviceId)),
      busy: (await loadBusyByVendor())[req.vendor.id] ?? [],
    });
  }));

  app.post("/api/vendor/busy", asVendor(async (req, res) => {
    const date = String(req.body?.date ?? "");
    if (!isDate(date) || date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: "Choose a date that has not passed." });
    const all = await loadBusyByVendor();
    const mine = new Set(all[req.vendor.id] ?? []);
    if (req.body?.busy) mine.add(date);
    else mine.delete(date);
    const next = [...mine].sort().slice(-400);
    await write("busy", { ...all, [req.vendor.id]: next });
    res.json(next);
  }));

  app.post("/api/vendor/bookings/:id/status", asVendor(async (req, res) => {
    const status = req.body?.status;
    const serviceId = String(req.body?.serviceId ?? "");
    if (!["Confirmed", "Declined"].includes(status)) return res.status(400).json({ error: "Choose confirm or decline." });
    if (!servicesOf(req.vendor).some((s) => s.id === serviceId)) return res.status(403).json({ error: "That service is not yours." });
    const bookings = await loadBookings();
    const booking = bookings.find((b) => b.id === req.params.id);
    if (!booking?.vendors.some((v) => v.serviceId === serviceId)) return res.status(404).json({ error: "We could not find that booking." });
    const changed = { ...booking, vendors: booking.vendors.map((v) => (v.serviceId === serviceId ? { ...v, status, statusAt: new Date().toISOString() } : v)) };
    await write("bookings", bookings.map((b) => (b.id === booking.id ? changed : b)));
    res.json({ ok: true });
  }));

  app.post("/api/vendor/visits/:id", asVendor(async (req, res) => {
    const status = req.body?.status;
    if (!["Confirmed", "Declined"].includes(status)) return res.status(400).json({ error: "Choose confirm or decline." });
    const visits = await read("appointments", []);
    const visit = visits.find((v) => v.id === req.params.id);
    if (!visit || !servicesOf(req.vendor).some((s) => s.id === visit.serviceId)) return res.status(404).json({ error: "We could not find that appointment." });
    if (visit.status === "Cancelled") return res.status(400).json({ error: "The customer has cancelled this appointment." });
    await write("appointments", visits.map((v) => (v.id === visit.id ? { ...v, status } : v)));
    res.json({ ok: true });
  }));

  app.post("/api/vendor/bookings/:id/messages", asVendor(async (req, res) => {
    const serviceId = String(req.body?.serviceId ?? "");
    const raw = String(req.body?.text ?? "").trim();
    if (!servicesOf(req.vendor).some((s) => s.id === serviceId)) return res.status(403).json({ error: "That service is not yours." });
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking?.quote.lines.some((line) => line.id === serviceId)) return res.status(404).json({ error: "We could not find that booking." });
    if (!raw) return res.status(400).json({ error: "Write a message first." });
    if (raw.length > 500) return res.status(400).json({ error: "Keep messages under 500 characters." });
    const text = hideContacts(raw);
    const all = await read(`messages:${booking.id}`, []);
    if (all.length >= 300) return res.status(400).json({ error: "This booking has reached its message limit." });
    const next = [...all, { serviceId, from: "vendor", text, hidden: text !== raw, at: new Date().toISOString() }];
    await write(`messages:${booking.id}`, next);
    res.status(201).json(next.filter((m) => m.serviceId === serviceId));
  }));

  // ---- Reviews

  app.get("/api/services/:id/reviews", safe(async (req, res) => {
    res.json((await loadReviews()).filter((review) => review.serviceId === req.params.id).map(({ bookingId, ...review }) => review));
  }));

  // A customer may review a vendor once per booking, after paying in full or after the event.
  app.post("/api/bookings/:id/reviews", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return res.status(403).json({ error: "Only the account that made this booking can review it." });
    const serviceId = String(req.body?.serviceId ?? "");
    const line = booking.quote.lines.find((l) => l.id === serviceId);
    if (!line) return res.status(400).json({ error: "That vendor is not on this booking." });
    const rating = Number(req.body?.rating);
    const text = hideContacts(String(req.body?.text ?? "").trim()).slice(0, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Choose from 1 to 5 stars." });
    if (booking.balance && booking.event.date > new Date().toISOString().slice(0, 10)) {
      return res.status(403).json({ error: "You can review a vendor once the event has happened or the balance is paid." });
    }
    const reviews = await loadReviews();
    if (reviews.some((r) => r.bookingId === booking.id && r.serviceId === serviceId)) return res.status(409).json({ error: "You have already reviewed this vendor for this booking." });
    const review = {
      id: `REV-${String(reviews.length + 1).padStart(4, "0")}-${crypto.randomBytes(2).toString("hex")}`,
      bookingId: booking.id, serviceId, vendor: line.vendor, service: line.name,
      rating, text, name: booking.customer || "A customer", eventType: booking.event.type, at: new Date().toISOString(),
    };
    await write("reviews", [...reviews, review]);
    res.status(201).json(review);
  }));

  // ---- Admin

  app.get("/api/admin/overview", asAdmin(async (_req, res) => {
    const [bookings, vendors, visits, reviews, hidden] = await Promise.all([loadBookings(), loadVendors(), read("appointments", []), loadReviews(), hiddenServiceIds()]);
    const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
    const payouts = bookings.flatMap((booking) =>
      booking.quote.lines.map((line) => ({
        bookingId: booking.id, serviceId: line.id, vendor: line.vendor, service: line.name, eventDate: booking.event.date,
        status: booking.vendors.find((v) => v.serviceId === line.id)?.status ?? "Waiting",
        due: dueFor(booking, line.id), paidOut: Boolean(booking.payouts?.[line.id]),
      }))
    );
    const live = payouts.filter((p) => p.status !== "Declined");
    res.json({
      demo: DEMO,
      totals: {
        bookings: bookings.length,
        value: sum(bookings, (b) => b.total ?? b.paid),
        collected: sum(bookings, (b) => b.paid),
        outstanding: sum(bookings, (b) => b.balance ?? 0),
        fees: sum(bookings, (b) => b.quote.platformFee),
        owedToVendors: sum(live.filter((p) => !p.paidOut), (p) => p.due),
        paidToVendors: sum(live.filter((p) => p.paidOut), (p) => p.due),
      },
      vendors: vendors.map((vendor) => {
        const ids = new Set(servicesOf(vendor).map((s) => s.id));
        const lines = payouts.filter((p) => ids.has(p.serviceId));
        const theirReviews = reviews.filter((r) => ids.has(r.serviceId));
        return {
          ...publicVendor(vendor),
          services: ids.size,
          bookings: lines.length,
          waiting: lines.filter((p) => p.status === "Waiting").length,
          declined: lines.filter((p) => p.status === "Declined").length,
          visitsWaiting: visits.filter((v) => ids.has(v.serviceId) && v.status === "Requested").length,
          rating: theirReviews.length ? Math.round((sum(theirReviews, (r) => r.rating) / theirReviews.length) * 10) / 10 : null,
          reviews: theirReviews.length,
        };
      }),
      bookings: bookings.map(({ id, createdAt, customer, event, total, paid, balance, method, balanceMethod, quote }) => ({
        id, createdAt, customer, event, total: total ?? paid, paid, balance: balance ?? 0, method, balanceMethod, fee: quote.platformFee,
      })),
      payouts, visits, reviews,
      hiddenServices: hidden.size,
    });
  }));

  app.post("/api/admin/vendors", asAdmin(async (req, res) => {
    const body = req.body ?? {};
    const name = String(body.business ?? "").trim().slice(0, 60);
    const password = String(body.password ?? "");
    if (name.length < 3) return res.status(400).json({ error: "Enter the business name." });
    if (!CATEGORIES.some((c) => c.id === body.category)) return res.status(400).json({ error: "Choose what the business does." });
    if (!DISTRICTS.includes(body.district)) return res.status(400).json({ error: "Choose the district." });
    if (password.length < 8) return res.status(400).json({ error: "Give a starting password of at least 8 characters." });
    if ((await loadVendors()).some((v) => v.id === slug(name))) return res.status(409).json({ error: "A business with that name already exists." });
    const vendor = await saveVendor({
      id: slug(name), name, owner: String(body.owner ?? "").trim().slice(0, 60), about: "", category: body.category, district: body.district,
      status: "approved", verified: true, sample: false, passHash: hashPassword(password), createdAt: new Date().toISOString(),
    });
    res.status(201).json(publicVendor(vendor));
  }));

  app.post("/api/admin/vendors/:id", asAdmin(async (req, res) => {
    const vendor = (await loadVendors()).find((v) => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ error: "We could not find that vendor." });
    const { action, password } = req.body ?? {};
    const changes = {
      approve: { status: "approved", verified: true },
      reject: { status: "rejected" },
      suspend: { status: "suspended" },
      restore: { status: "approved" },
      verify: { verified: true },
      unverify: { verified: false },
    }[action];
    if (action === "password") {
      if (String(password ?? "").length < 8) return res.status(400).json({ error: "Give a password of at least 8 characters." });
      return res.json(publicVendor(await saveVendor({ ...vendor, passHash: hashPassword(String(password)) })));
    }
    if (!changes) return res.status(400).json({ error: "That action is not known." });
    res.json(publicVendor(await saveVendor({ ...vendor, ...changes, reviewedAt: new Date().toISOString() })));
  }));

  // Recording that a vendor has been paid their share for a booking. No money moves here.
  app.post("/api/admin/payouts", asAdmin(async (req, res) => {
    const { bookingId, serviceId, paid } = req.body ?? {};
    const bookings = await loadBookings();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking?.quote.lines.some((line) => line.id === serviceId)) return res.status(404).json({ error: "We could not find that booking." });
    const changed = { ...booking, payouts: { ...booking.payouts, [serviceId]: paid ? new Date().toISOString() : null } };
    await write("bookings", bookings.map((b) => (b.id === booking.id ? changed : b)));
    res.json({ ok: true });
  }));

  app.post("/api/admin/reviews/:id/remove", asAdmin(async (req, res) => {
    const reviews = await loadReviews();
    if (!reviews.some((r) => r.id === req.params.id)) return res.status(404).json({ error: "We could not find that review." });
    await write("reviews", reviews.filter((r) => r.id !== req.params.id));
    res.json({ ok: true });
  }));
}
