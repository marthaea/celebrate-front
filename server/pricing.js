import { DISTRICTS, EVENT_TYPES } from "./data.js";

export const PLATFORM_FEE_RATE = 0.03;

// Share of the grand total paid when booking; the rest is paid on the day of the event.
export const DEPOSIT_RATE = 0.3;
export const depositFor = (total) => Math.round(total * DEPOSIT_RATE);

export function quantityFor(service, event) {
  switch (service.qtyRule) {
    case "perGuest":
      return event.guests;
    case "per100Guests":
      return Math.max(1, Math.ceil(event.guests / 100));
    case "perTent":
      return Math.max(1, event.tents);
    default:
      return 1;
  }
}

const plural = (n, unit) => `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;

/** Returns a list of problems with the event details; empty when they are fine. */
export function validateEvent(event, today = new Date()) {
  const errors = [];
  if (!event || typeof event !== "object") return ["Event details are missing."];
  if (!EVENT_TYPES.includes(event.type)) errors.push("Choose an event type.");
  if (!Number.isInteger(event.guests) || event.guests < 1 || event.guests > 5000) errors.push("Guests must be between 1 and 5,000.");
  if (!Number.isInteger(event.tents) || event.tents < 0 || event.tents > 100) errors.push("Tents must be between 0 and 100.");
  if (!DISTRICTS.includes(event.district)) errors.push("Choose a district.");
  if (!["vendor", "self"].includes(event.setup)) errors.push("Choose who handles setup.");
  if (typeof event.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || Number.isNaN(Date.parse(event.date))) {
    errors.push("Choose an event date.");
  } else if (event.date < today.toISOString().slice(0, 10)) {
    errors.push("The event date has passed.");
  }
  return errors;
}

/** One number, every detail: line items, labour, transport, platform fee and the grand total. */
export function buildQuote(services, event) {
  const vendorSetup = event.setup === "vendor";
  let itemCost = 0;
  let labour = 0;
  let transport = 0;

  const lines = services.map((service) => {
    const qty = quantityFor(service, event);
    const amount = service.price * qty;
    itemCost += amount;
    if (vendorSetup) labour += service.labour + service.labourPerQty * qty;
    transport += service.transport;
    const detail = service.qtyRule === "flat" ? service.summary : `${service.summary} × ${plural(qty, service.unit)}`;
    return { id: service.id, category: service.category, name: service.name, vendor: service.vendor, qty, unit: service.unit, detail, amount };
  });

  const platformFee = Math.round((itemCost + labour + transport) * PLATFORM_FEE_RATE);
  return { lines, itemCost, labour, transport, platformFee, feeRate: PLATFORM_FEE_RATE, total: itemCost + labour + transport + platformFee };
}
