// Host (customer) accounts, following the agreed sign-up:
//   1. The host taps Sign up and enters their name and phone number.
//   2. A one-time code is sent by SMS.
//   3. The host enters the code. A wrong code can be retried, up to three times.
//   4. The host accepts the terms and privacy notice by ticking a box.
//   5. The account is created and the home page opens.
// Signing in later uses the same code by SMS: there are no customer passwords.
//
// SMS: until SMS_PROVIDER is set, no text is sent. The code is returned in the response instead
// (as `demoCode`) so the site can show it. A real backend must never return the code.
//
// Bookings and appointments made while signed in belong to the account. Only the owner can then
// open the booking, message its vendors, pay, cancel, complain or review. Bookings made without
// an account (the earlier phone-app version still makes those) stay reachable by receipt number.
import crypto from "node:crypto";
import { claimsOf, makeToken, same, tooManyAttempts, verifyHuman } from "./auth.js";
import { read, write } from "./store.js";
import { loadBookingsRaw, saveBookings } from "./core.js";

const SESSION_DAYS = 30;
export const SIMULATED_SMS = !process.env.SMS_PROVIDER;
export const TERMS_VERSION = "2026-11";
const CODE_MINUTES = 10;
export const CODE_TRIES = 3;

/** "0770 123 456", "+256 770 123456" and "256770123456" all become "256770123456"; anything else null. */
export function normalisePhone(text) {
  const digits = String(text ?? "").replace(/[\s().-]/g, "");
  const match = digits.match(/^(?:\+?256|0)(7\d{8})$/);
  return match ? `256${match[1]}` : null;
}

/** "256770123456" shown the way people write it: "0770 123 456". */
export const showPhone = (phone) => `0${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;

export const loadCustomers = () => read("customers", []);
const publicCustomer = ({ passHash, ...customer }) => ({ ...customer, phone: showPhone(customer.phone) });

/** Creates an account. Returns { customer } or { error, status }. */
export async function createCustomer({ name, phone, termsVersion = TERMS_VERSION }) {
  const cleanName = String(name ?? "").trim().slice(0, 40);
  const number = normalisePhone(phone);
  if (!cleanName) return { error: "Tell us your name.", status: 400 };
  if (!number) return { error: "Enter a Ugandan mobile number, like 0770 123 456.", status: 400 };
  const customers = await loadCustomers();
  if (customers.some((c) => c.phone === number)) {
    return { error: "An account with that number already exists. Sign in instead.", status: 409 };
  }
  if (customers.length >= 20000) return { error: "We cannot open new accounts right now. Please try later.", status: 429 };
  const customer = {
    id: `CUS-${crypto.randomBytes(6).toString("hex")}`,
    name: cleanName, phone: number, status: "active", createdAt: new Date().toISOString(),
    termsAccepted: { version: termsVersion, at: new Date().toISOString() },
  };
  await write("customers", [...customers, customer]);
  return { customer };
}

/** The signed-in, active customer behind a request, or null. */
export async function currentCustomer(req) {
  const claims = claimsOf(req);
  if (claims?.role !== "customer") return null;
  const customer = (await loadCustomers()).find((c) => c.id === claims.customer);
  return customer?.status === "active" ? customer : null;
}

/**
 * Whether a request may see or act on a booking or appointment. Records with an owner are
 * the owner's alone; records without one stay open to anyone who has their number, as before.
 */
export async function mayUse(req, record) {
  if (!record?.customerId) return true;
  return (await currentCustomer(req))?.id === record.customerId;
}

const session = (customer) => ({ token: makeToken({ role: "customer", customer: customer.id }, SESSION_DAYS * 24), customer: publicCustomer(customer) });
const hashCode = (phone, code) => crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");

export function addCustomers(app, { safe, loadBookings, asAdmin }) {
  // Steps 1 and 2: send a code. `purpose` is "signup" (needs a name) or "signin".
  app.post("/api/customers/code", safe(async (req, res) => {
    const number = normalisePhone(req.body?.phone);
    const purpose = req.body?.purpose === "signup" ? "signup" : "signin";
    if (!number) return res.status(400).json({ error: "Enter a Ugandan mobile number, like 0770 123 456." });
    const name = String(req.body?.name ?? "").trim().slice(0, 40);
    if (purpose === "signup" && !name) return res.status(400).json({ error: "Tell us your name." });
    if (tooManyAttempts(`code-ip:${req.ip}`, 10)) return res.status(429).json({ error: "Too many codes asked for. Wait ten minutes and try again." });
    const human = await verifyHuman(req.body?.token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    const exists = (await loadCustomers()).find((c) => c.phone === number);
    if (purpose === "signup" && exists) return res.status(409).json({ error: "An account with that number already exists. Sign in instead." });
    if (purpose === "signin" && !exists) return res.status(404).json({ error: "There is no account with that number. Sign up instead." });
    if (exists && exists.status !== "active") return res.status(403).json({ error: "This account has been suspended. Contact Celebrate." });

    // At most three codes per number in ten minutes, so nobody can flood someone's phone.
    if (tooManyAttempts(`code:${number}`, 3)) return res.status(429).json({ error: "Too many codes sent to this number. Wait ten minutes and try again." });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    await write(`code:${number}`, { hash: hashCode(number, code), purpose, name, tries: 0, expires: Date.now() + CODE_MINUTES * 60000 });
    // A real backend sends the SMS here: "Your Celebrate code is 123456. It expires in 10 minutes."
    res.json({ sent: true, phone: showPhone(number), expiresInMinutes: CODE_MINUTES, tries: CODE_TRIES, ...(SIMULATED_SMS && { demoCode: code }) });
  }));

  // Steps 3 to 5: check the code, then sign in or open the account.
  app.post("/api/customers/verify", safe(async (req, res) => {
    const number = normalisePhone(req.body?.phone);
    if (!number) return res.status(400).json({ error: "Enter a Ugandan mobile number, like 0770 123 456." });
    const pending = await read(`code:${number}`, null);
    if (!pending || pending.expires < Date.now()) {
      await write(`code:${number}`, null);
      return res.status(410).json({ error: "That code has run out. Ask for a new one.", expired: true });
    }
    const code = String(req.body?.code ?? "").replace(/\s/g, "");
    if (!same(hashCode(number, code), pending.hash)) {
      const tries = pending.tries + 1;
      const left = CODE_TRIES - tries;
      if (left <= 0) {
        await write(`code:${number}`, null);
        return res.status(429).json({ error: "That code is wrong three times. Ask for a new code.", expired: true, triesLeft: 0 });
      }
      await write(`code:${number}`, { ...pending, tries });
      return res.status(401).json({ error: `That code is not right. You have ${left} ${left === 1 ? "try" : "tries"} left.`, triesLeft: left });
    }
    if (pending.purpose === "signup") {
      // A4: the code is right; the account is only opened once the terms are accepted.
      if (req.body?.acceptTerms !== true) return res.status(400).json({ error: "Tick the box to accept the terms and privacy notice.", needsTerms: true });
      const made = await createCustomer({ name: pending.name, phone: number });
      if (made.error) return res.status(made.status).json({ error: made.error });
      await write(`code:${number}`, null);
      return res.status(201).json(session(made.customer));
    }
    const customer = (await loadCustomers()).find((c) => c.phone === number);
    await write(`code:${number}`, null);
    if (!customer || customer.status !== "active") return res.status(403).json({ error: "This account cannot sign in. Contact Celebrate." });
    res.json(session(customer));
  }));

  const signedIn = (handler) => safe(async (req, res) => {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(401).json({ error: "Please sign in again." });
    req.customer = customer;
    return handler(req, res);
  });

  app.get("/api/me", signedIn(async (req, res) => res.json(publicCustomer(req.customer))));

  app.post("/api/me", signedIn(async (req, res) => {
    const clean = String(req.body?.name ?? "").trim().slice(0, 40);
    if (!clean) return res.status(400).json({ error: "Your name cannot be empty." });
    const updated = { ...req.customer, name: clean };
    await write("customers", (await loadCustomers()).map((c) => (c.id === updated.id ? updated : c)));
    res.json(publicCustomer(updated));
  }));

  app.get("/api/me/bookings", signedIn(async (req, res) => {
    res.json((await loadBookings()).filter((b) => b.customerId === req.customer.id));
  }));

  app.get("/api/me/appointments", signedIn(async (req, res) => {
    res.json((await read("appointments", [])).filter((v) => v.customerId === req.customer.id));
  }));

  // The host's own data, as one file (their right of access under the Data Protection and Privacy Act).
  app.get("/api/me/data", signedIn(async (req, res) => {
    const id = req.customer.id;
    const [bookings, appointments, notes, reviews] = await Promise.all([loadBookings(), read("appointments", []), read("notes", []), read("reviews", [])]);
    const theirs = bookings.filter((b) => b.customerId === id);
    const ids = new Set(theirs.map((b) => b.id));
    res.json({
      exportedAt: new Date().toISOString(),
      account: publicCustomer(req.customer),
      bookings: theirs,
      appointments: appointments.filter((v) => v.customerId === id),
      notifications: notes.filter((n) => n.to === `customer:${id}`),
      reviews: reviews.filter((r) => ids.has(r.bookingId)),
    });
  }));

  // Deleting the account. Bookings stay for the vendors' and Celebrate's records, without the host's
  // name, and nobody can open them as that host again.
  app.post("/api/me/delete", signedIn(async (req, res) => {
    if (req.body?.confirm !== true) return res.status(400).json({ error: "Confirm that you want to delete your account." });
    const id = req.customer.id;
    const gone = "Deleted account";
    await write("customers", (await loadCustomers()).filter((c) => c.id !== id));
    await saveBookings((await loadBookingsRaw()).map((b) => (b.customerId === id ? { ...b, customer: gone } : b)));
    await write("appointments", (await read("appointments", [])).map((v) => (v.customerId === id ? { ...v, name: gone } : v)));
    await write("notes", (await read("notes", [])).filter((n) => n.to !== `customer:${id}`));
    res.json({ ok: true });
  }));

  // ---- Admin: customer accounts

  app.get("/api/admin/customers", asAdmin(async (_req, res) => {
    const [customers, bookings, visits] = await Promise.all([loadCustomers(), loadBookings(), read("appointments", [])]);
    res.json(customers.map((customer) => {
      const theirs = bookings.filter((b) => b.customerId === customer.id && b.status !== "awaiting_payment");
      return {
        ...publicCustomer(customer),
        bookings: theirs.length,
        spent: theirs.reduce((sum, b) => sum + b.paid - (b.refunds ?? []).reduce((s, r) => s + r.amount, 0), 0),
        owing: theirs.reduce((sum, b) => sum + (b.balance ?? 0), 0),
        appointments: visits.filter((v) => v.customerId === customer.id).length,
      };
    }));
  }));

  app.post("/api/admin/customers/:id", asAdmin(async (req, res) => {
    const customers = await loadCustomers();
    const customer = customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: "We could not find that customer." });
    const action = req.body?.action;
    if (!["suspend", "restore"].includes(action)) return res.status(400).json({ error: "That action is not known." });
    const updated = { ...customer, status: action === "suspend" ? "suspended" : "active" };
    await write("customers", customers.map((c) => (c.id === updated.id ? updated : c)));
    res.json(publicCustomer(updated));
  }));
}
