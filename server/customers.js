// Customer accounts: a name, a Ugandan mobile number and a password.
//
// Bookings and appointments made while signed in belong to the account. Only the owner can then
// open the booking, message its vendors, pay its balance or review it. Bookings made without an
// account (the earlier phone-app version still makes those) stay reachable by receipt number.
import crypto from "node:crypto";
import { checkPassword, claimsOf, hashPassword, makeToken, tooManyAttempts, verifyHuman } from "./auth.js";
import { read, write } from "./store.js";

const SESSION_DAYS = 30;

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
export async function createCustomer({ name, phone, password }) {
  const cleanName = String(name ?? "").trim().slice(0, 40);
  const number = normalisePhone(phone);
  if (!cleanName) return { error: "Tell us your name.", status: 400 };
  if (!number) return { error: "Enter a Ugandan mobile number, like 0770 123 456.", status: 400 };
  if (String(password ?? "").length < 8) return { error: "Choose a password of at least 8 characters.", status: 400 };
  const customers = await loadCustomers();
  if (customers.some((c) => c.phone === number)) {
    return { error: "An account with that number already exists. Sign in instead.", status: 409 };
  }
  if (customers.length >= 20000) return { error: "We cannot open new accounts right now. Please try later.", status: 429 };
  const customer = {
    id: `CUS-${crypto.randomBytes(6).toString("hex")}`,
    name: cleanName, phone: number, passHash: hashPassword(String(password)),
    status: "active", createdAt: new Date().toISOString(),
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
 * the owner's alone; records without one (made before accounts, or by the phone app) are open
 * to anyone who has their number, as before.
 */
export async function mayUse(req, record) {
  if (!record?.customerId) return true;
  return (await currentCustomer(req))?.id === record.customerId;
}

const session = (customer) => ({ token: makeToken({ role: "customer", customer: customer.id }, SESSION_DAYS * 24), customer: publicCustomer(customer) });

export function addCustomers(app, { safe, loadBookings, asAdmin }) {
  app.post("/api/customers/register", safe(async (req, res) => {
    const human = await verifyHuman(req.body?.token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    const made = await createCustomer(req.body ?? {});
    if (made.error) return res.status(made.status).json({ error: made.error });
    res.status(201).json(session(made.customer));
  }));

  app.post("/api/customers/login", safe(async (req, res) => {
    const number = normalisePhone(req.body?.phone);
    if (tooManyAttempts(`${req.ip}:customer:${number ?? "?"}`)) {
      return res.status(429).json({ error: "Too many attempts. Wait ten minutes and try again." });
    }
    const human = await verifyHuman(req.body?.token);
    if (human.error) return res.status(human.status).json({ error: human.error });
    const customer = number && (await loadCustomers()).find((c) => c.phone === number);
    if (!customer || !checkPassword(String(req.body?.password ?? ""), customer.passHash)) {
      return res.status(401).json({ error: "That number and password do not match." });
    }
    if (customer.status !== "active") return res.status(403).json({ error: "This account has been suspended. Contact Celebrate." });
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
    const { name, password, newPassword } = req.body ?? {};
    const changes = {};
    if (name !== undefined) {
      const clean = String(name).trim().slice(0, 40);
      if (!clean) return res.status(400).json({ error: "Your name cannot be empty." });
      changes.name = clean;
    }
    if (newPassword !== undefined) {
      if (!checkPassword(String(password ?? ""), req.customer.passHash)) return res.status(401).json({ error: "Your current password is not right." });
      if (String(newPassword).length < 8) return res.status(400).json({ error: "Choose a new password of at least 8 characters." });
      changes.passHash = hashPassword(String(newPassword));
    }
    const updated = { ...req.customer, ...changes };
    await write("customers", (await loadCustomers()).map((c) => (c.id === updated.id ? updated : c)));
    res.json(publicCustomer(updated));
  }));

  app.get("/api/me/bookings", signedIn(async (req, res) => {
    res.json((await loadBookings()).filter((b) => b.customerId === req.customer.id));
  }));

  app.get("/api/me/appointments", signedIn(async (req, res) => {
    res.json((await read("appointments", [])).filter((v) => v.customerId === req.customer.id));
  }));

  // ---- Admin: customer accounts

  app.get("/api/admin/customers", asAdmin(async (_req, res) => {
    const [customers, bookings, visits] = await Promise.all([loadCustomers(), loadBookings(), read("appointments", [])]);
    res.json(customers.map((customer) => {
      const theirs = bookings.filter((b) => b.customerId === customer.id);
      return {
        ...publicCustomer(customer),
        bookings: theirs.length,
        spent: theirs.reduce((sum, b) => sum + b.paid, 0),
        owing: theirs.reduce((sum, b) => sum + (b.balance ?? 0), 0),
        appointments: visits.filter((v) => v.customerId === customer.id).length,
      };
    }));
  }));

  app.post("/api/admin/customers/:id", asAdmin(async (req, res) => {
    const customers = await loadCustomers();
    const customer = customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: "We could not find that customer." });
    const { action, password } = req.body ?? {};
    let updated;
    if (action === "suspend") updated = { ...customer, status: "suspended" };
    else if (action === "restore") updated = { ...customer, status: "active" };
    else if (action === "password") {
      if (String(password ?? "").length < 8) return res.status(400).json({ error: "Give a password of at least 8 characters." });
      updated = { ...customer, passHash: hashPassword(String(password)) };
    } else return res.status(400).json({ error: "That action is not known." });
    await write("customers", customers.map((c) => (c.id === updated.id ? updated : c)));
    res.json(publicCustomer(updated));
  }));
}
