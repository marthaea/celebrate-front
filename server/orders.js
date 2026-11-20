// Orders, from payment to payout, following the agreed workflow:
//
//   D  Grand total and payment: a booking waits for its payment; the payment partner asks the host
//      to approve on their phone; paid issues the e-receipt and tells the vendors; failed lets the
//      host try again or change method.
//   E  Delivery and payout: each vendor accepts within 24 hours; reminders 7 days and 1 day before;
//      the vendor marks "Delivered" on the day; the host confirms (or it confirms itself after 48
//      hours); the vendor is then paid their price, the platform fee being on top of it.
//   F  Cancellation, refund and complaint: the host or a vendor cancels with a reason; the refund
//      follows how early it is; when a vendor cancels the admin offers a replacement or a full
//      refund; a host's complaint after the event is reviewed within three working days.
//
// Money never moves in this sample API. Payments, refunds and payouts are recorded and simulated
// until a payment provider is connected (set PAYMENT_PROVIDER and replace the marked parts).
import { CATEGORIES, cleanPlace, EVENT_ALIASES, PAYMENT_METHODS } from "./data.js";
import { buildQuote, depositFor, validateEvent } from "./pricing.js";
import { unavailable } from "./availability.js";
import { read, write } from "./store.js";
import { currentCustomer, mayUse } from "./customers.js";
import { loadBusy, loadCatalogue } from "./vendors.js";
import { addReaders } from "./uploads.js";
import { addWorkingDays, daysUntil, hideContacts, hoursFrom, loadBookingsRaw, money, notesFor, notify, now, safe, saveBookings, today } from "./core.js";

export const RESPOND_HOURS = 24;
export const CONFIRM_HOURS = 48;
export const CASE_WORKING_DAYS = 3;
export const SIMULATED_PAYMENTS = !process.env.PAYMENT_PROVIDER;
// A simulated payment approves itself after this long, as if the host had entered their PIN.
const AUTO_APPROVE_SECONDS = 6;
const FIRST_RECEIPT = 123;

export const REFUND_RULES = [
  { fromDays: 30, rate: 1, text: "30 days or more before the event: everything you have paid comes back" },
  { fromDays: 8, rate: 0.5, text: "8 to 29 days before: half of what you have paid comes back" },
  { fromDays: -Infinity, rate: 0, text: "7 days or less before: no refund" },
];
export const refundRuleFor = (date) => REFUND_RULES.find((rule) => daysUntil(date) >= rule.fromDays);

const categoryName = new Map(CATEGORIES.map((c) => [c.id, c.name]));
const deny = (res) => res.status(403).json({ error: "This booking belongs to another account. Sign in as its owner." });
const lineOf = (booking, serviceId) => booking.quote.lines.find((line) => line.id === serviceId);
const vendorLineOf = (booking, serviceId) => booking.vendors.find((v) => v.serviceId === serviceId);
/** What the vendor is paid for a line: their price, labour and transport. */
export const dueOf = (booking, serviceId) => {
  const line = lineOf(booking, serviceId);
  return line ? line.due ?? line.amount : 0;
};
/** What a line costs the host, our fee included. */
export const allInOf = (booking, serviceId) => Math.round(dueOf(booking, serviceId) * (1 + booking.quote.feeRate));
const refundedOf = (booking) => (booking.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
const refundedFor = (booking, serviceId) => (booking.refunds ?? []).filter((r) => r.serviceId === serviceId).reduce((sum, r) => sum + r.amount, 0);
const id = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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

function newPayment(kind, amount, method, phone) {
  return {
    id: id("PAY"), kind, amount, method: method.id, methodName: method.name,
    // Only the last digits are kept, enough for the host to recognise the number.
    phone: phone ? `••• ${phone.slice(-3)}` : null,
    status: "pending", createdAt: now(), settledAt: null, reason: null, forced: null,
  };
}

// ---- Settling: everything that happens with time passing, applied whenever bookings are read.

function paymentSucceeded(booking, payment, notes) {
  payment.status = "succeeded";
  payment.settledAt = now();
  booking.paid += payment.amount;
  booking.balance = Math.max(0, booking.total - booking.paid);
  if (payment.kind === "balance") {
    booking.balanceMethod = payment.methodName;
    notes.push({ to: `customer:${booking.customerId}`, text: `Balance of ${money(payment.amount)} received for ${booking.id}. You are paid in full.`, link: `/receipt/${booking.id}` });
    return;
  }
  booking.status = "active";
  booking.paidAt = payment.settledAt;
  booking.method = payment.methodName;
  for (const line of booking.vendors) {
    if (line.status === "Waiting") line.respondBy = hoursFrom(booking.paidAt, RESPOND_HOURS);
    notes.push({ to: `vendor:${line.vendorId}`, text: `New booking ${booking.id}: ${booking.event.type} on ${booking.event.date} in ${booking.event.district}. ${line.status === "Waiting" ? "Accept or decline within 24 hours." : "It is confirmed."}`, link: "/vendor" });
  }
  if (booking.customerId) {
    notes.push({ to: `customer:${booking.customerId}`, text: `Payment of ${money(payment.amount)} received. Your e-receipt is ${booking.id}, and your vendors have been told.`, link: `/receipt/${booking.id}` });
  }
}

function paymentFailed(booking, payment, reason, notes) {
  payment.status = "failed";
  payment.settledAt = now();
  payment.reason = reason;
  if (booking.customerId) {
    notes.push({ to: `customer:${booking.customerId}`, text: `Payment of ${money(payment.amount)} did not go through: ${reason} Try again or choose another method.`, link: payment.kind === "balance" ? `/receipt/${booking.id}` : `/pay/${booking.id}` });
  }
}

/** Brings one booking up to date. Returns true when it changed; adds notifications to `notes`. */
function settle(booking, notes, at = Date.now()) {
  let changed = false;
  for (const payment of booking.payments ?? []) {
    if (payment.status !== "pending") continue;
    if (payment.forced === "failed") {
      paymentFailed(booking, payment, payment.forcedReason || "The payment was declined.", notes);
      changed = true;
    } else if (payment.forced === "succeeded" || (SIMULATED_PAYMENTS && at - Date.parse(payment.createdAt) >= AUTO_APPROVE_SECONDS * 1000)) {
      paymentSucceeded(booking, payment, notes);
      changed = true;
    }
  }
  if (booking.status !== "active") return changed;
  for (const line of booking.vendors) {
    if (line.status === "Confirmed" && line.deliveredAt && !line.confirmedAt && !line.hold && at >= Date.parse(hoursFrom(line.deliveredAt, CONFIRM_HOURS))) {
      line.confirmedAt = hoursFrom(line.deliveredAt, CONFIRM_HOURS);
      line.autoConfirmed = true;
      changed = true;
    }
    // Paying the vendor. Simulated: a real backend sends the money through the payment provider here.
    if (line.confirmedAt && !line.hold && line.payout?.status !== "paid") {
      const amount = Math.max(0, dueOf(booking, line.serviceId) - refundedFor(booking, line.serviceId));
      line.payout = { status: "paid", amount, paidAt: now() };
      notes.push({ to: `vendor:${line.vendorId}`, text: `Payout of ${money(amount)} sent for ${booking.id}.`, link: "/vendor" });
      changed = true;
    }
  }
  return changed;
}

/** All bookings, brought up to date with the passing of time. */
export async function loadBookings() {
  const list = await loadBookingsRaw();
  const notes = [];
  let changed = false;
  for (const booking of list) if (settle(booking, notes)) changed = true;
  if (changed) await saveBookings(list);
  await notify(notes);
  return list;
}

export async function updateBooking(booking) {
  const list = await loadBookingsRaw();
  await saveBookings(list.map((b) => (b.id === booking.id ? booking : b)));
  return booking;
}

// ---- Refunds and cases

function addRefund(booking, amount, reason, extra = {}) {
  if (amount <= 0) return null;
  // Simulated: a real backend sends the money back through the original payment method here.
  const refund = { id: id("REF"), amount: Math.round(amount), reason, method: booking.method, at: now(), ...extra };
  booking.refunds = [...(booking.refunds ?? []), refund];
  return refund;
}

export const loadCases = () => read("cases", []);
const saveCases = (list) => write("cases", list);

async function openCase(fields) {
  const cases = await loadCases();
  const record = {
    id: `CASE-${String(cases.length + 1).padStart(4, "0")}`, status: "open", openedAt: now(),
    response: null, resolution: null, evidence: [], ...fields,
  };
  await saveCases([...cases, record]);
  return record;
}

/** A vendor (or the admin, for a vendor who never answered) takes a vendor off a booking. */
export async function vendorCancels(booking, serviceId, reason, by) {
  const line = vendorLineOf(booking, serviceId);
  line.status = line.status === "Waiting" ? "Declined" : "Cancelled";
  line.cancelled = { by, reason, at: now() };
  line.payout = { status: "none" };
  const record = await openCase({
    type: "vendor-cancel", bookingId: booking.id, serviceId, vendorId: line.vendorId, vendor: line.vendor,
    customerId: booking.customerId, customer: booking.customer, text: reason,
    dueBy: addWorkingDays(now(), 1),
  });
  line.caseId = record.id;
  await updateBooking(booking);
  await notify([
    { to: `customer:${booking.customerId}`, text: `${line.vendor} cannot do your ${booking.event.type.toLowerCase()} on ${booking.event.date}. Celebrate will offer you a replacement or a full refund for it.`, link: `/receipt/${booking.id}` },
    { to: "admin", text: `${line.vendor} cancelled on ${booking.id}: "${reason}". Offer a replacement or a refund.`, link: "/admin" },
  ]);
  return record;
}

/** The admin settles a case. Returns { booking, case } or { error }. */
export async function resolveCase(caseId, decision, catalogue) {
  const cases = await loadCases();
  const record = cases.find((c) => c.id === caseId);
  if (!record || record.status !== "open") return { error: "That case is not open.", status: 404 };
  const bookings = await loadBookings();
  const booking = bookings.find((b) => b.id === record.bookingId);
  const line = vendorLineOf(booking, record.serviceId);
  const notes = [];
  const note = String(decision?.note ?? "").trim().slice(0, 400);
  let resolution;

  if (record.type === "vendor-cancel" && decision?.action === "replacement") {
    const service = catalogue.visible.find((s) => s.id === decision.serviceId);
    const old = lineOf(booking, record.serviceId);
    if (!service || service.category !== old.category) return { error: "Choose a replacement of the same kind.", status: 400 };
    if (booking.quote.lines.some((l) => l.id === service.id)) return { error: "That service is already on this booking.", status: 400 };
    const busy = await loadBusy(catalogue);
    if (unavailable([service.id], booking.event.date, bookings, busy).length) return { error: `${service.vendor} is not free that day.`, status: 409 };
    const [fresh] = buildQuote([service], booking.event, { [service.id]: old.choices }).lines;
    // The host pays what they agreed; the new vendor is paid their own price.
    booking.quote.lines.push({ ...fresh, amount: old.amount, replaces: old.id });
    booking.vendors.push({
      serviceId: service.id, category: categoryName.get(service.category), vendor: service.vendor, vendorId: service.vendorId,
      status: "Waiting", respondBy: hoursFrom(now(), RESPOND_HOURS), payout: { status: "waiting" }, replaces: old.id,
    });
    line.status = "Replaced";
    resolution = { action: "replacement", serviceId: service.id, vendor: service.vendor, note, at: now() };
    notes.push(
      { to: `customer:${booking.customerId}`, text: `${service.vendor} will replace ${line.vendor} on ${booking.id}, at no extra cost to you.`, link: `/receipt/${booking.id}` },
      { to: `vendor:${service.vendorId}`, text: `New booking ${booking.id} (a replacement): ${booking.event.type} on ${booking.event.date}. Accept or decline within 24 hours.`, link: "/vendor" },
    );
  } else if (record.type === "vendor-cancel" && decision?.action === "refund") {
    // Full refund for that vendor: the host no longer pays for it at all.
    const allIn = allInOf(booking, record.serviceId);
    const newTotal = booking.total - allIn;
    const netPaid = booking.paid - refundedOf(booking);
    const back = Math.max(0, netPaid - newTotal);
    booking.total = newTotal;
    booking.balance = Math.max(0, newTotal - netPaid);
    addRefund(booking, back, `${line.vendor} cancelled`, { serviceId: record.serviceId, caseId: record.id });
    line.status = "Refunded";
    resolution = { action: "refund", amount: allIn, sentBack: back, note, at: now() };
    notes.push({ to: `customer:${booking.customerId}`, text: back ? `Refund of ${money(back)} sent to your ${booking.method} for ${line.vendor}.` : `${line.vendor} is removed from ${booking.id} and your balance goes down by ${money(allIn)}.`, link: `/receipt/${booking.id}` });
  } else if (record.type === "complaint" && ["refund", "dismiss"].includes(decision?.action)) {
    let amount = 0;
    if (decision.action === "refund") {
      amount = Math.round(Number(decision.amount));
      const most = Math.min(allInOf(booking, record.serviceId), booking.paid - refundedOf(booking));
      if (!Number.isFinite(amount) || amount < 1000 || amount > most) return { error: `Refund between UGX 1,000 and ${money(most)}.`, status: 400 };
      addRefund(booking, amount, `Complaint about ${line.vendor}`, { serviceId: record.serviceId, caseId: record.id });
    }
    line.hold = null;
    if (!line.confirmedAt) line.confirmedAt = now();
    resolution = { action: decision.action, amount, note, at: now() };
    notes.push(
      { to: `customer:${booking.customerId}`, text: amount ? `Your complaint about ${line.vendor} is settled: ${money(amount)} refunded to your ${booking.method}.` : `Your complaint about ${line.vendor} is settled with no refund. ${note}`, link: `/receipt/${booking.id}` },
      { to: `vendor:${line.vendorId}`, text: `The complaint on ${booking.id} is settled${amount ? `: ${money(amount)} refunded to the customer from your payout` : " in your favour"}.`, link: "/vendor" },
    );
  } else {
    return { error: "Choose how to settle this case.", status: 400 };
  }

  record.status = "resolved";
  record.resolution = resolution;
  await saveCases(cases);
  await updateBooking(booking);
  await notify(notes);
  await loadBookings(); // releases any payout the decision unblocked
  return { booking, case: record };
}

// ---- Reminders (computed, not stored): 7 days and 1 day before each event.

function remindersFor(booking, to, link) {
  if (booking.status !== "active" || booking.event.date < today()) return [];
  const list = [];
  for (const days of [7, 1]) {
    const at = new Date(Date.parse(`${booking.event.date}T06:00:00Z`) - days * 86400000);
    if (Date.now() >= at.getTime()) {
      list.push({ id: `reminder-${days}-${booking.id}`, at: at.toISOString(), to, link, text: `${days === 1 ? "Tomorrow" : "In 7 days"}: ${booking.event.type} on ${booking.event.date} in ${booking.event.district} (${booking.id}).` });
    }
  }
  return list;
}

export async function notificationsFor(to, bookings, link) {
  const stored = await notesFor(to);
  const reminders = bookings.flatMap((b) => remindersFor(b, to, link(b)));
  return [...stored, ...reminders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
}

// ---- Routes for hosts

export function addOrders(app) {
  /** Validates and prices a plan. Returns { event, services, quote, choices } or { error, status }. */
  async function prepare(body, catalogue) {
    const event = body?.event && { ...body.event, type: EVENT_ALIASES[body.event.type] ?? body.event.type, district: cleanPlace(body.event.district), location: hideContacts(String(body.event.location ?? "")).trim().slice(0, 120) };
    const errors = validateEvent(event);
    if (errors.length) return { error: errors.join(" "), status: 400 };
    const ids = Array.isArray(body?.items) ? [...new Set(body.items.map(String))] : [];
    if (!ids.length) return { error: "Your plan is empty.", status: 400 };
    const services = ids.map((sid) => catalogue.byId.get(sid));
    if (services.some((s) => !s)) return { error: "A service in your plan is no longer available.", status: 400 };
    if (services.some((s) => !catalogue.visibleIds.has(s.id))) return { error: "A service in your plan is no longer available. Remove it and try again.", status: 409 };
    const choices = body?.choices && typeof body.choices === "object" ? body.choices : {};
    return { event, services, choices, quote: buildQuote(services, event, choices) };
  }

  app.post("/api/bookings", safe(async (req, res) => {
    const catalogue = await loadCatalogue();
    const plan = await prepare(req.body, catalogue);
    if (plan.error) return res.status(plan.status).json({ error: plan.error });
    const owner = await currentCustomer(req);
    // `prompt`: the website's flow, where the booking waits until the host approves the payment on
    // their phone. Without it (the earlier phone-app version) the payment is taken as approved at once.
    const prompt = Boolean(req.body?.prompt);
    if (prompt && !owner) return res.status(401).json({ error: "Sign in to pay." });
    const { method, phone, error } = readPayment(req.body?.payment);
    if (error) return res.status(400).json({ error });

    const bookings = await loadBookings();
    const busy = await loadBusy(catalogue);
    const clash = unavailable(plan.services.map((s) => s.id), plan.event.date, bookings, busy);
    if (clash.length) {
      const names = clash.map((sid) => catalogue.byId.get(sid).vendor).join(", ");
      return res.status(409).json({ error: `Not free on that date: ${names}. Choose another date or swap the service.`, unavailable: clash });
    }

    const { quote } = plan;
    const deposit = Boolean(req.body?.deposit);
    const payment = newPayment(deposit ? "deposit" : "full", deposit ? depositFor(quote.total) : quote.total, method, phone);
    const booking = {
      id: `CLB-${String(FIRST_RECEIPT + bookings.length).padStart(6, "0")}`,
      createdAt: now(),
      customer: owner ? owner.name : String(req.body?.customer ?? "").slice(0, 60),
      customerId: owner?.id ?? null,
      event: plan.event, quote, choices: plan.choices,
      status: "awaiting_payment", total: quote.total, paid: 0, balance: quote.total,
      depositRate: deposit ? payment.amount / quote.total : 1,
      method: method.name, payments: [payment], refunds: [],
      vendors: plan.services.map((service) => ({
        serviceId: service.id, category: categoryName.get(service.category), vendor: service.vendor, vendorId: service.vendorId,
        status: service.instantConfirm ? "Confirmed" : "Waiting", respondBy: null, payout: { status: "waiting" },
      })),
    };
    const notes = [];
    if (!prompt) paymentSucceeded(booking, payment, notes);
    await saveBookings([booking, ...bookings]);
    await notify(notes);
    res.status(201).json(booking);
  }));

  // Bookings without an owner only. A signed-in host's own bookings come from /api/me/bookings.
  app.get("/api/bookings", safe(async (_req, res) => res.json((await loadBookings()).filter((b) => !b.customerId))));

  app.get("/api/bookings/:id", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const cases = (await loadCases()).filter((c) => c.bookingId === booking.id);
    res.json({ ...booking, cases, refundRule: refundRuleFor(booking.event.date), now: now() });
  }));

  // Paying again after a failed attempt, or paying the balance.
  app.post("/api/bookings/:id/payments", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const kind = req.body?.kind === "balance" ? "balance" : "deposit";
    const { method, phone, error } = readPayment(req.body?.payment);
    if (error) return res.status(400).json({ error });
    if (booking.payments.some((p) => p.status === "pending")) return res.status(409).json({ error: "A payment is already waiting for approval on your phone." });
    let amount;
    if (kind === "deposit") {
      if (booking.status !== "awaiting_payment") return res.status(400).json({ error: "This booking is already paid for." });
      const bookings = await loadBookings();
      const clash = unavailable(booking.quote.lines.map((l) => l.id), booking.event.date, bookings, await loadBusy(), booking.id);
      if (clash.length) return res.status(409).json({ error: "Someone else has just booked one of your vendors for that day. Go back to your plan to swap it.", unavailable: clash });
      amount = Math.round(booking.total * (booking.depositRate ?? 1));
      booking.createdAt = now(); // renews the hold on the vendors' dates
    } else {
      if (booking.status !== "active" || !booking.balance) return res.status(400).json({ error: "There is no balance to pay." });
      amount = booking.balance;
    }
    const payment = newPayment(kind === "deposit" && booking.depositRate === 1 ? "full" : kind, amount, method, phone);
    booking.payments.push(payment);
    await updateBooking(booking);
    res.status(201).json(payment);
  }));

  // The earlier phone-app version pays the balance in one step.
  app.post("/api/bookings/:id/balance", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    if (!booking.balance || booking.status !== "active") return res.status(400).json({ error: "This booking is already paid in full." });
    const { method, phone, error } = readPayment(req.body?.payment);
    if (error) return res.status(400).json({ error });
    const payment = newPayment("balance", booking.balance, method, phone);
    booking.payments.push(payment);
    const notes = [];
    paymentSucceeded(booking, payment, notes);
    await updateBooking(booking);
    await notify(notes);
    res.json(booking);
  }));

  async function findPayment(req, res) {
    const bookings = await loadBookings();
    const booking = bookings.find((b) => b.payments?.some((p) => p.id === req.params.id));
    if (!booking) return res.status(404).json({ error: "We could not find that payment." }), null;
    if (!(await mayUse(req, booking))) return deny(res), null;
    return { booking, payment: booking.payments.find((p) => p.id === req.params.id) };
  }

  app.get("/api/payments/:id", safe(async (req, res) => {
    const found = await findPayment(req, res);
    if (!found) return;
    res.json({ ...found.payment, booking: { id: found.booking.id, status: found.booking.status, paid: found.booking.paid, balance: found.booking.balance, total: found.booking.total } });
  }));

  // Simulated payments only: lets a demonstration show both outcomes without waiting.
  app.post("/api/payments/:id/simulate", safe(async (req, res) => {
    if (!SIMULATED_PAYMENTS) return res.status(404).json({ error: "Not found." });
    const found = await findPayment(req, res);
    if (!found) return;
    if (found.payment.status !== "pending") return res.status(400).json({ error: "This payment is already settled." });
    const outcome = req.body?.outcome === "failed" ? "failed" : "succeeded";
    found.payment.forced = outcome;
    found.payment.forcedReason = outcome === "failed" ? "The PIN was not entered in time, or the account has too little money." : null;
    await updateBooking(found.booking);
    const settled = (await loadBookings()).find((b) => b.id === found.booking.id);
    res.json(settled.payments.find((p) => p.id === req.params.id));
  }));

  app.get("/api/bookings/:id/cancellation", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const rule = refundRuleFor(booking.event.date);
    const netPaid = booking.paid - refundedOf(booking);
    res.json({ daysBefore: daysUntil(booking.event.date), rule, rules: REFUND_RULES.map((r) => r.text), refund: Math.round(netPaid * rule.rate), paid: netPaid });
  }));

  app.post("/api/bookings/:id/cancel", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const reason = hideContacts(String(req.body?.reason ?? "")).trim().slice(0, 300);
    if (!reason) return res.status(400).json({ error: "Tell us why you are cancelling." });
    if (booking.status === "cancelled") return res.status(400).json({ error: "This booking is already cancelled." });
    if (booking.event.date < today()) return res.status(400).json({ error: "The event has passed. Report a problem instead." });
    if (booking.payments.some((p) => p.status === "pending")) return res.status(409).json({ error: "Wait for the payment on your phone to finish first." });
    const rule = refundRuleFor(booking.event.date);
    const back = booking.status === "active" ? Math.round((booking.paid - refundedOf(booking)) * rule.rate) : 0;
    const notes = [];
    if (booking.status === "active") {
      for (const line of booking.vendors) {
        if (["Waiting", "Confirmed"].includes(line.status)) {
          line.status = "Cancelled";
          line.cancelled = { by: "customer", reason, at: now() };
          line.payout = { status: "none" };
          notes.push({ to: `vendor:${line.vendorId}`, text: `${booking.id} on ${booking.event.date} was cancelled by the customer. The date is free again.`, link: "/vendor" });
        }
      }
      addRefund(booking, back, "Cancelled by the customer");
    }
    booking.status = "cancelled";
    booking.balance = 0;
    booking.cancellation = { by: "customer", reason, at: now(), rate: rule.rate, rule: rule.text, refund: back };
    if (back) notes.push({ to: `customer:${booking.customerId}`, text: `Refund of ${money(back)} sent to your ${booking.method} for ${booking.id}.`, link: `/receipt/${booking.id}` });
    await updateBooking(booking);
    await notify(notes);
    res.json(booking);
  }));

  app.post("/api/bookings/:id/lines/:serviceId/confirm", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const line = vendorLineOf(booking, req.params.serviceId);
    if (!line?.deliveredAt) return res.status(400).json({ error: "The vendor has not marked this delivered yet." });
    if (line.hold) return res.status(400).json({ error: "Your complaint about this vendor is being reviewed." });
    if (!line.confirmedAt) line.confirmedAt = now();
    await updateBooking(booking);
    await loadBookings(); // pays the vendor
    res.json((await loadBookings()).find((b) => b.id === booking.id));
  }));

  app.post("/api/bookings/:id/lines/:serviceId/complaint", safe(async (req, res) => {
    const booking = (await loadBookings()).find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: "We could not find that booking." });
    if (!(await mayUse(req, booking))) return deny(res);
    const line = vendorLineOf(booking, req.params.serviceId);
    if (!line || !["Confirmed"].includes(line.status)) return res.status(400).json({ error: "You can only complain about a vendor who took part in the event." });
    if (!line.deliveredAt && booking.event.date > today()) return res.status(400).json({ error: "You can report a problem once the event has happened." });
    if (line.payout?.status === "paid" && line.confirmedAt && Date.now() - Date.parse(line.confirmedAt) > 7 * 86400000) {
      return res.status(400).json({ error: "Complaints are taken up to 7 days after delivery is confirmed." });
    }
    const cases = await loadCases();
    if (cases.some((c) => c.bookingId === booking.id && c.serviceId === line.serviceId && c.type === "complaint")) {
      return res.status(409).json({ error: "You have already reported a problem with this vendor for this booking." });
    }
    const text = hideContacts(String(req.body?.text ?? "")).trim().slice(0, 1000);
    if (text.length < 10) return res.status(400).json({ error: "Tell us what went wrong, in a sentence or two." });
    const evidence = Array.isArray(req.body?.evidence) ? req.body.evidence.map(String).slice(0, 6) : [];
    const record = await openCase({
      type: "complaint", bookingId: booking.id, serviceId: line.serviceId, vendorId: line.vendorId, vendor: line.vendor,
      customerId: booking.customerId, customer: booking.customer, text, evidence,
      dueBy: addWorkingDays(now(), CASE_WORKING_DAYS),
    });
    await addReaders(evidence, [`vendor:${line.vendorId}`]);
    line.hold = record.id;
    await updateBooking(booking);
    await notify([
      { to: `vendor:${line.vendorId}`, text: `A complaint about ${booking.id} has been opened. Give your side and any evidence in your workspace.`, link: "/vendor" },
      { to: "admin", text: `New complaint ${record.id} about ${line.vendor} on ${booking.id}. Decide by ${record.dueBy.slice(0, 10)}.`, link: "/admin" },
    ]);
    res.status(201).json(record);
  }));

  app.get("/api/me/notifications", safe(async (req, res) => {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(401).json({ error: "Please sign in again." });
    const mine = (await loadBookings()).filter((b) => b.customerId === customer.id);
    res.json(await notificationsFor(`customer:${customer.id}`, mine, (b) => `/receipt/${b.id}`));
  }));
}
