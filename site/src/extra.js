// Calls the website makes beyond the ones it shares with the phone app (src/api.js).
// Every call carries the signed-in customer's token, when there is one.
import { customerToken } from "./account.jsx";

/** Thrown when the server could not be reached at all, as opposed to answering "no". */
export class Offline extends Error {}
/** Thrown when the server says the sign-in has run out or is not good. */
export class NotSignedIn extends Error {}

async function request(path, data) {
  const token = customerToken();
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: data && JSON.stringify(data),
    });
  } catch {
    throw new Offline("We could not reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (response.status === 401) throw new NotSignedIn(body?.error ?? "Please sign in again.");
  if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Please try again.");
  return body;
}

export const more = {
  options: (event) => request("/options", { event }),
  availability: (date, items) => request("/availability", { date, items }),
  month: (id, month) => request(`/services/${encodeURIComponent(id)}/availability?month=${month}`),
  pledges: (key) => request(`/pledges/${key}`),
  pledge: (key, data) => request(`/pledges/${key}`, data),
  // A: sign up and sign in with a code sent by SMS.
  sendCode: (data) => request("/customers/code", data),
  verifyCode: (data) => request("/customers/verify", data),
  notifications: () => request("/me/notifications"),
  quote: (event, items, choices) => request("/quote", { event, items, choices }),
  service: (id) => request(`/services/${encodeURIComponent(id)}`),
  services: (params = {}) => request(`/services?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))}`),
  // D: payments wait for the host to approve on their phone.
  payment: (id) => request(`/payments/${id}`),
  pay: (bookingId, kind, payment) => request(`/bookings/${bookingId}/payments`, { kind, payment }),
  simulate: (id, outcome) => request(`/payments/${id}/simulate`, { outcome }),
  // E and F
  confirmDelivery: (bookingId, serviceId) => request(`/bookings/${bookingId}/lines/${encodeURIComponent(serviceId)}/confirm`, {}),
  complain: (bookingId, serviceId, data) => request(`/bookings/${bookingId}/lines/${encodeURIComponent(serviceId)}/complaint`, data),
  cancellation: (bookingId) => request(`/bookings/${bookingId}/cancellation`),
  cancel: (bookingId, reason) => request(`/bookings/${bookingId}/cancel`, { reason }),
  upload: (data) => request("/uploads", data),
  me: () => request("/me"),
  updateMe: (data) => request("/me", data),
  myBookings: () => request("/me/bookings"),
  myVisits: () => request("/me/appointments"),
  book: (data) => request("/bookings", data),
  booking: (id) => request(`/bookings/${encodeURIComponent(id)}`),
  verify: (id) => request(`/bookings/${encodeURIComponent(id)}/verify`),
  messages: (id) => request(`/bookings/${id}/messages`),
  sendMessage: (id, serviceId, text) => request(`/bookings/${id}/messages`, { serviceId, text }),
  slots: (id, date) => request(`/services/${encodeURIComponent(id)}/slots?date=${date}`),
  bookVisit: (data) => request("/appointments", data),
  visits: (ids) => request(`/appointments?ids=${ids.join(",")}`),
  cancelVisit: (id) => request(`/appointments/${id}/cancel`, {}),
  review: (id, data) => request(`/bookings/${id}/reviews`, data),
  reviews: (id) => request(`/services/${encodeURIComponent(id)}/reviews`),
};

// The signed-in customer's bookings are also kept in this browser, so receipts still open offline.
// Cleared on signing out.
const KEY = "celebrate.bookings.v1";
export const localBookings = {
  all() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },
  get: (id) => localBookings.all().find((booking) => booking.id === id) ?? null,
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
  },
  save(booking) {
    try {
      localStorage.setItem(KEY, JSON.stringify([booking, ...localBookings.all().filter((b) => b.id !== booking.id)].slice(0, 30)));
    } catch {
      // Storage is unavailable; the server copy is still there.
    }
  },
};

/** Whole days from today until an ISO date (0 on the day, negative once it has passed). */
export function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

/** A shared plan travels inside its own link, so the link works without anything being stored. */
export function encodePlan({ event, items, host, choices }) {
  const bytes = new TextEncoder().encode(JSON.stringify({ e: event, i: items, h: host, c: choices }));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePlan(code) {
  try {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0))));
    if (!data?.e || !Array.isArray(data.i) || !data.i.length) return null;
    return { event: data.e, items: data.i.map(String), host: String(data.h ?? "").slice(0, 40), choices: data.c && typeof data.c === "object" ? data.c : {} };
  } catch {
    return null;
  }
}

/** A short key for a shared plan, used to file its pledges. */
export function planKey(code) {
  let h = 2166136261;
  for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `p${(h >>> 0).toString(36)}`.padEnd(7, "0");
}
