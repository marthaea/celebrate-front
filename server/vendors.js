// Vendor accounts, the services they offer, their busy dates and their reviews.
//
// The catalogue is the sample services in data.js plus the services vendors add themselves.
// A vendor's services are only shown to customers while the vendor is approved.
import { SERVICES } from "./data.js";
import { read, write } from "./store.js";

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Every business in the sample catalogue starts as an approved vendor, so there is something to manage.
const SEEDS = [...new Map(SERVICES.map((service) => [service.vendor, service])).values()].map((service) => ({
  id: slug(service.vendor), name: service.vendor, owner: "", district: service.district, category: service.category,
  about: "", status: "approved", verified: service.verified, sample: true, passHash: null, createdAt: "2026-01-01T00:00:00.000Z",
  contacts: {}, proofs: {}, workPhotos: [],
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

// Services vendors add themselves, stored as they entered them.
export const loadOwnServices = () => read("vendorServices", []);
export const saveOwnServices = (list) => write("vendorServices", list);

/** A vendor's own service in the same shape as the sample ones. */
function asService(own, vendor) {
  return {
    id: own.id, category: own.category, name: own.name, vendor: vendor?.name ?? own.vendorId, vendorId: own.vendorId,
    district: own.district || vendor?.district, price: own.price, unit: own.unit, qtyRule: own.qtyRule,
    verified: Boolean(vendor?.verified), rating: 0, reviews: 0, wasPrice: own.wasPrice || null, summary: own.summary || own.name.toLowerCase(),
    labour: own.labour || 0, labourPerQty: own.labourPerQty || 0, transport: own.transport || 0, instantConfirm: false,
    included: own.included ?? [], review: null, photoCaption: own.name, photos: own.photoIds?.length ?? 0,
    photoIds: own.photoIds ?? [], own: true,
  };
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

/**
 * Everything on offer. `all` includes services of vendors who are not approved (suspended, or still
 * applying), because existing bookings still refer to them; `visible` is what customers can browse and book.
 */
export async function loadCatalogue() {
  const [vendors, own, reviews] = await Promise.all([loadVendors(), loadOwnServices(), loadReviews()]);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const all = [
    ...SERVICES.map((service) => ({ ...service, vendorId: slug(service.vendor) })),
    ...own.filter((o) => !o.removed).map((o) => asService(o, vendorById.get(o.vendorId))),
  ].map((service) => withReviews(service, reviews));
  const approved = (service) => vendorById.get(service.vendorId)?.status === "approved";
  const visible = all.filter(approved);
  const byId = new Map(all.map((service) => [service.id, service]));
  return { all, visible, byId, visibleIds: new Set(visible.map((s) => s.id)), vendors, vendorById };
}

export const servicesOf = (vendor, catalogue) => catalogue.all.filter((service) => service.vendorId === vendor.id);

/** Dates each vendor has marked busy, keyed by vendor id. */
export const loadBusyByVendor = () => read("busy", {});

/** The same dates keyed by service id, which is what the availability checks want. */
export async function loadBusy(catalogue) {
  const byVendor = await loadBusyByVendor();
  const cat = catalogue ?? (await loadCatalogue());
  return Object.fromEntries(cat.all.map((service) => [service.id, byVendor[service.vendorId] ?? []]));
}
