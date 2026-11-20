// When a service is free. A date is taken when the vendor has a live booking that day, or has
// marked the day busy in their own calendar. A booking still waiting for its payment holds its
// services for a short while, so two people cannot pay for the same day at once.
export const HOLD_MINUTES = 15;

/** Whether a booking keeps its vendors' dates taken. */
function holds(booking, at = Date.now()) {
  if (booking.status === "cancelled") return false;
  if (booking.status === "awaiting_payment") return at - Date.parse(booking.createdAt) < HOLD_MINUTES * 60000;
  return true;
}

const lineIsLive = (booking, serviceId) => {
  const status = booking.vendors?.find((v) => v.serviceId === serviceId)?.status;
  return !["Declined", "Cancelled", "Replaced", "Refunded"].includes(status);
};

/**
 * The ids, from `serviceIds`, that are not free on `date`.
 * `busy` maps a service id to the dates its vendor has blocked: { "buffet": ["2026-12-12"] }.
 * `except` is a booking id to leave out (a booking does not clash with itself).
 */
export function unavailable(serviceIds, date, bookings = [], busy = {}, except = null) {
  const taken = new Set(
    bookings
      .filter((booking) => booking.event.date === date && booking.id !== except && holds(booking))
      .flatMap((booking) => booking.quote.lines.filter((line) => lineIsLive(booking, line.id)).map((line) => line.id))
  );
  return serviceIds.filter((id) => taken.has(id) || busy[id]?.includes(date));
}

/** Every date in a month ("2026-12") on which the service is not free. */
export function bookedDays(serviceId, month, bookings = [], busy = {}) {
  const [year, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const all = Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  return all.filter((date) => unavailable([serviceId], date, bookings, busy).length > 0);
}

/** The first date on or after `date`, within about four months, on which every service is free. */
export function nextFreeDate(serviceIds, date, bookings = [], busy = {}) {
  const day = new Date(`${date}T00:00:00Z`);
  for (let i = 0; i < 120; i += 1) {
    const iso = day.toISOString().slice(0, 10);
    if (unavailable(serviceIds, iso, bookings, busy).length === 0) return iso;
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return null;
}
