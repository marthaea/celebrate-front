// When a service is free. A date is taken when the vendor has an event booked through the site
// that day (and has not declined it), or has marked the day busy in their own calendar.

/**
 * The ids, from `serviceIds`, that are not free on `date`.
 * `busy` maps a service id to the dates its vendor has blocked: { "buffet": ["2026-12-12"] }.
 */
export function unavailable(serviceIds, date, bookings = [], busy = {}) {
  const taken = new Set(
    bookings
      .filter((booking) => booking.event.date === date)
      .flatMap((booking) =>
        booking.quote.lines
          .filter((line) => booking.vendors?.find((v) => v.serviceId === line.id)?.status !== "Declined")
          .map((line) => line.id)
      )
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
