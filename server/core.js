// Small helpers shared across the API.
import { read, write } from "./store.js";

// Express 4 does not catch errors from async handlers by itself.
export const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

export const money = (n) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
export const isDate = (text) => typeof text === "string" && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString();
export const hoursFrom = (iso, hours) => new Date(new Date(iso).getTime() + hours * 3600000).toISOString();

/** Whole days from today to an ISO date (negative once it has passed). */
export const daysUntil = (date) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86400000);

/** The moment `days` working days (Monday to Friday) after `iso`. */
export function addWorkingDays(iso, days) {
  const at = new Date(iso);
  let left = days;
  while (left > 0) {
    at.setUTCDate(at.getUTCDate() + 1);
    const day = at.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return at.toISOString();
}

/** Customers and vendors talk on the site only: phone numbers and email addresses are taken out. */
export function hideContacts(text) {
  return String(text ?? "")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number removed]");
}

export const loadBookingsRaw = () => read("bookings", []);
export const saveBookings = (list) => write("bookings", list);

// Notifications: a short line of text and a link, addressed to "customer:<id>", "vendor:<id>" or "admin".
// A real backend would also send these by SMS; here they appear in the site's notification lists.
export async function notify(items) {
  const list = (Array.isArray(items) ? items : [items]).filter((item) => item?.to);
  if (!list.length) return;
  const notes = await read("notes", []);
  const at = now();
  await write("notes", [...notes, ...list.map((item, i) => ({ id: `${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 6)}`, at, ...item }))].slice(-3000));
}

export const notesFor = async (to) => (await read("notes", [])).filter((note) => note.to === to);
