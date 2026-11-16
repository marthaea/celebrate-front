// Calls the website makes beyond the ones it shares with the phone app (src/api.js).
async function request(path, data) {
  let response;
  try {
    response = await fetch(`/api${path}`, data && { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch {
    throw new Error("We could not reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Please try again.");
  return body;
}

export const more = {
  options: (event) => request("/options", { event }),
  availability: (date, items) => request("/availability", { date, items }),
  month: (id, month) => request(`/services/${encodeURIComponent(id)}/availability?month=${month}`),
  pledges: (key) => request(`/pledges/${key}`),
  pledge: (key, data) => request(`/pledges/${key}`, data),
  login: (data) => request("/login", data),
  payBalance: (id, payment) => request(`/bookings/${id}/balance`, { payment }),
  messages: (id) => request(`/bookings/${id}/messages`),
  sendMessage: (id, serviceId, text) => request(`/bookings/${id}/messages`, { serviceId, text }),
  slots: (id, date) => request(`/services/${encodeURIComponent(id)}/slots?date=${date}`),
  bookVisit: (data) => request("/appointments", data),
  visits: (ids) => request(`/appointments?ids=${ids.join(",")}`),
  cancelVisit: (id) => request(`/appointments/${id}/cancel`, {}),
  review: (id, data) => request(`/bookings/${id}/reviews`, data),
  reviews: (id) => request(`/services/${encodeURIComponent(id)}/reviews`),
};

// The appointments made in this browser, by id. Without accounts, this is how "my appointments" is known.
const VISITS = "celebrate.visits.v1";
export const localVisits = {
  ids() {
    try {
      const list = JSON.parse(localStorage.getItem(VISITS));
      return Array.isArray(list) ? list.map(String) : [];
    } catch {
      return [];
    }
  },
  add(id) {
    try {
      localStorage.setItem(VISITS, JSON.stringify([...new Set([id, ...localVisits.ids()])].slice(0, 50)));
    } catch {
      // The appointment is still made; it just will not be listed on this device.
    }
  },
};

// Bookings made in this browser are also kept here, so receipts still open if the server forgets them.
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
export function encodePlan({ event, items, host }) {
  const bytes = new TextEncoder().encode(JSON.stringify({ e: event, i: items, h: host }));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePlan(code) {
  try {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0))));
    if (!data?.e || !Array.isArray(data.i) || !data.i.length) return null;
    return { event: data.e, items: data.i.map(String), host: String(data.h ?? "").slice(0, 40) };
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
