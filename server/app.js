import express from "express";
import { CATEGORIES, DISTRICTS, EVENT_TYPES, OFFER_IDS, PAYMENT_METHODS, SERVICES, VISIT_TIMES } from "./data.js";
import { addExtras, readPayment } from "./extras.js";
import { TURNSTILE } from "./auth.js";
import { currentCustomer, mayUse } from "./customers.js";
import { buildQuote, DEPOSIT_RATE, depositFor, PLATFORM_FEE_RATE, validateEvent } from "./pricing.js";
import { bookedDays, nextFreeDate, unavailable } from "./availability.js";
import { read, write } from "./store.js";
import { addStaff, DEMO, DEMO_ADMIN_PASSWORD, DEMO_VENDOR_PASSWORD } from "./staff.js";
import { hiddenServiceIds, loadBusy, loadReviews, withReviews } from "./vendors.js";

const app = express();
app.use(express.json({ limit: "50kb" }));

const byId = new Map(SERVICES.map((service) => [service.id, service]));
const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));

// Bookings and pledges are kept through store.js: in memory unless the host plugs in something lasting.
const loadBookings = () => read("bookings", []);
const FIRST_RECEIPT = 123;

// Express 4 does not catch errors from async handlers by itself.
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

const money = (n) => `UGX ${n.toLocaleString("en-US")}`;

function resolveItems(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { error: "Your plan is empty." };
  const unique = [...new Set(ids)];
  const services = unique.map((id) => byId.get(id));
  if (services.some((service) => !service)) return { error: "A service in your plan is no longer available." };
  return { services };
}

app.get("/api/meta", (_req, res) => {
  res.json({
    eventTypes: EVENT_TYPES, districts: DISTRICTS, categories: CATEGORIES, paymentMethods: PAYMENT_METHODS,
    depositRate: DEPOSIT_RATE, visitTimes: VISIT_TIMES,
    turnstile: { siteKey: TURNSTILE.siteKey, test: TURNSTILE.test },
    // In demo mode (no ADMIN_PASSWORD set) the sign-in pages show these so the interfaces can be tried.
    demo: DEMO ? { admin: DEMO_ADMIN_PASSWORD, vendor: DEMO_VENDOR_PASSWORD } : null,
  });
});

/** The catalogue customers can see: vendors in good standing, with ratings brought up to date. */
async function catalogue() {
  const [hidden, reviews] = await Promise.all([hiddenServiceIds(), loadReviews()]);
  return SERVICES.filter((service) => !hidden.has(service.id)).map((service) => withReviews(service, reviews));
}

app.get("/api/services", safe(async (req, res) => {
  const { category, filter } = req.query;
  const q = String(req.query.q ?? "").trim().toLowerCase();
  let list = await catalogue();
  if (category) list = list.filter((service) => service.category === category);
  if (q) {
    // Every word must appear somewhere; "in" and "near" are ignored so "tents in Mukono" works.
    const words = q.split(/\s+/).filter((word) => !["in", "near", "at", "for", "a", "the"].includes(word));
    list = list.filter((service) => {
      const haystack = [service.name, service.vendor, service.district, service.category, categoryById.get(service.category).title].join(" ").toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }
  if (filter === "under500k") list = list.filter((service) => service.price < 500000);
  if (filter === "top") list = list.filter((service) => service.rating >= 4.7);
  if (filter === "offers") list = list.filter((service) => service.wasPrice);
  res.json(list);
}));

app.get("/api/services/:id", safe(async (req, res) => {
  const service = (await catalogue()).find((s) => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "We could not find that service." });
  res.json(service);
}));

app.get("/api/offers", safe(async (_req, res) => {
  const list = await catalogue();
  res.json(OFFER_IDS.map((id) => list.find((s) => s.id === id)).filter(Boolean));
}));

app.post("/api/quote", (req, res) => {
  const { event, items } = req.body ?? {};
  const errors = validateEvent(event);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  const { services, error } = resolveItems(items);
  if (error) return res.status(400).json({ error });
  res.json(buildQuote(services, event));
});

// Every way of filling each category for this event, with what it would cost all-in before the
// platform fee. The budget planner and the compare page are built on this.
app.post("/api/options", safe(async (req, res) => {
  const { event } = req.body ?? {};
  const errors = validateEvent(event);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  const list = await catalogue();
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
  if (!byId.has(req.params.id)) return res.status(404).json({ error: "We could not find that service." });
  const month = String(req.query.month ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "Choose a month." });
  res.json({ month, booked: bookedDays(req.params.id, month, await loadBookings(), await loadBusy()) });
}));

app.post("/api/availability", safe(async (req, res) => {
  const { date, items } = req.body ?? {};
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose an event date." });
  const { services, error } = resolveItems(items);
  if (error) return res.status(400).json({ error });
  const ids = services.map((service) => service.id);
  const bookings = await loadBookings();
  const busy = await loadBusy();
  const clash = unavailable(ids, date, bookings, busy);
  res.json({ date, unavailable: clash, nextFree: clash.length ? nextFreeDate(ids, date, bookings, busy) : date });
}));

app.post("/api/bookings", safe(async (req, res) => {
  const { event, items, payment, customer, deposit } = req.body ?? {};
  const errors = validateEvent(event);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  const { services, error } = resolveItems(items);
  if (error) return res.status(400).json({ error });

  // Signed in: the booking belongs to the account, and only that account can open it.
  // Not signed in (the phone-app version): anyone with the receipt number can open it, as before.
  const owner = await currentCustomer(req);
  const { method, error: paymentError } = readPayment(payment);
  if (paymentError) return res.status(400).json({ error: paymentError });

  const bookings = await loadBookings();
  const hidden = await hiddenServiceIds();
  if (services.some((service) => hidden.has(service.id))) return res.status(409).json({ error: "A service in your plan is no longer available. Remove it and try again." });
  const clash = unavailable(services.map((service) => service.id), event.date, bookings, await loadBusy());
  if (clash.length) {
    const names = clash.map((id) => byId.get(id).vendor).join(", ");
    return res.status(409).json({ error: `Not free on that date: ${names}. Choose another date or swap the service.` });
  }

  // No money moves here. Connect a payment provider (MTN MoMo, Airtel Money, a card gateway) at this point.
  const quote = buildQuote(services, event);
  const booking = {
    id: `CLB-${String(FIRST_RECEIPT + bookings.length).padStart(6, "0")}`,
    createdAt: new Date().toISOString(),
    customer: owner ? owner.name : String(customer ?? "").slice(0, 60),
    customerId: owner?.id ?? null,
    event,
    quote,
    // With `deposit`, part is paid now and the balance on the day; otherwise everything is paid now.
    total: quote.total,
    paid: deposit ? depositFor(quote.total) : quote.total,
    balance: deposit ? quote.total - depositFor(quote.total) : 0,
    method: method.name,
    vendors: services.map((service) => ({
      category: categoryById.get(service.category).name,
      vendor: service.vendor,
      serviceId: service.id,
      status: service.instantConfirm ? "Confirmed" : "Waiting",
    })),
  };
  await write("bookings", [booking, ...bookings]);
  res.status(201).json(booking);
}));

// Bookings without an owner only. A signed-in customer's own bookings come from /api/me/bookings.
app.get("/api/bookings", safe(async (_req, res) => res.json((await loadBookings()).filter((b) => !b.customerId))));

app.get("/api/bookings/:id", safe(async (req, res) => {
  const booking = (await loadBookings()).find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "We could not find that booking." });
  if (!(await mayUse(req, booking))) return res.status(403).json({ error: "This booking belongs to another account. Sign in as its owner." });
  res.json(booking);
}));

// What a vendor scanning a receipt's QR code may see: that the booking is real, what was booked
// and whether it is paid. Not the customer's phone number or messages.
app.get("/api/bookings/:id/verify", safe(async (req, res) => {
  const booking = (await loadBookings()).find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "We could not find that booking." });
  const { id, event, quote, total, paid, balance, method, vendors } = booking;
  res.json({
    id, total: total ?? paid, paid, balance: balance ?? 0, method,
    customer: String(booking.customer ?? "").split(" ")[0],
    event: { type: event.type, date: event.date, district: event.district, guests: event.guests },
    quote: { lines: quote.lines },
    vendors,
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
    row("GRAND TOTAL", money(quote.total)),
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

addExtras(app, { safe, loadBookings, byId, categoryById });
addStaff(app, { safe, loadBookings });

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

export default app;
