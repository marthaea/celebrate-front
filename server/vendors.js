// Vendor accounts, their busy dates and their reviews: the records the vendor and admin
// interfaces work on. Kept through store.js like everything else in the sample API.
import { SERVICES } from "./data.js";
import { read, write } from "./store.js";

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Every business in the sample catalogue starts as an approved vendor, so there is something to manage.
const SEEDS = [...new Map(SERVICES.map((service) => [service.vendor, service])).values()].map((service) => ({
  id: slug(service.vendor), name: service.vendor, owner: "", district: service.district, category: service.category,
  about: "", status: "approved", verified: service.verified, sample: true, passHash: null, createdAt: "2026-01-01T00:00:00.000Z",
}));

/** All vendor accounts: the sample ones, overlaid with anything changed or added since. */
export async function loadVendors() {
  const saved = await read("vendors", []);
  const byId = new Map(SEEDS.map((vendor) => [vendor.id, vendor]));
  for (const vendor of saved) byId.set(vendor.id, { ...byId.get(vendor.id), ...vendor });
  return [...byId.values()];
}

export async function saveVendor(vendor) {
  const saved = await read("vendors", []);
  await write("vendors", [...saved.filter((v) => v.id !== vendor.id), vendor]);
  return vendor;
}

export const servicesOf = (vendor) => SERVICES.filter((service) => slug(service.vendor) === vendor.id);

/** Dates each vendor has marked busy, keyed by vendor id. */
export const loadBusyByVendor = () => read("busy", {});

/** The same dates keyed by service id, which is what the availability checks want. */
export async function loadBusy() {
  const byVendor = await loadBusyByVendor();
  return Object.fromEntries(SERVICES.map((service) => [service.id, byVendor[slug(service.vendor)] ?? []]));
}

/** Ids of services whose vendor is not currently approved (suspended, say): they cannot be booked. */
export async function hiddenServiceIds() {
  const blocked = new Set((await loadVendors()).filter((vendor) => vendor.status !== "approved").map((vendor) => vendor.id));
  return new Set(SERVICES.filter((service) => blocked.has(slug(service.vendor))).map((service) => service.id));
}

export const loadReviews = () => read("reviews", []);

/** A service with its rating and review count brought up to date with reviews left on the site. */
export function withReviews(service, reviews) {
  const mine = reviews.filter((review) => review.serviceId === service.id);
  if (!mine.length) return service;
  const count = service.reviews + mine.length;
  const rating = (service.rating * service.reviews + mine.reduce((sum, review) => sum + review.rating, 0)) / count;
  return { ...service, reviews: count, rating: Math.round(rating * 10) / 10 };
}
