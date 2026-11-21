// The agreed workflow, step by step (A to F), run against the real API in this process.
import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import { createCustomer } from "../server/customers.js";
import { makeToken } from "../server/auth.js";
import { nextFreeDate } from "../server/availability.js";
import { read, write } from "../server/store.js";

// Cloudflare's check is answered here: "good-token" passes, anything else fails.
const realFetch = globalThis.fetch;
globalThis.fetch = (url, options) =>
  String(url).includes("challenges.cloudflare.com")
    ? Promise.resolve(new Response(JSON.stringify({ success: options.body.get("response") === "good-token" })))
    : realFetch(url, options);

const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
test.after(() => server.close());

const request = async (path, data, token) => {
  const response = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: data && JSON.stringify(data),
  });
  const type = response.headers.get("content-type") ?? "";
  return { status: response.status, body: type.includes("json") ? await response.json() : await response.arrayBuffer() };
};
const call = (path, data) => request(path, data);
const as = (claims) => (path, data) => request(path, data, makeToken(claims));
const admin = as({ role: "admin" });
let phone = 300000;
async function host(name = "Nantongo") {
  const { customer } = await createCustomer({ name, phone: `0775${phone++}` });
  return { customer, call: (path, data) => request(path, data, makeToken({ role: "customer", customer: customer.id })) };
}
const dayOffset = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const event = (date, extra = {}) => ({ type: "Introduction", guests: 250, tents: 6, date, district: "Mukono", setup: "vendor", location: "Seeta, near the church", ...extra });
const payment = { method: "mtn", phone: "0770 000 000" };
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Books and pays (simulated) through the website's flow. */
async function bookAndPay(who, items, date, extra = {}) {
  const made = await who.call("/bookings", { event: event(date), items, payment, deposit: true, prompt: true, ...extra });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  await who.call(`/payments/${made.body.payments[0].id}/simulate`, { outcome: "succeeded" });
  return (await who.call(`/bookings/${made.body.id}`)).body;
}

test("A: sign up with an SMS code, three tries, and the terms", async () => {
  const number = "0789 111 222";
  assert.equal((await call("/customers/code", { phone: number, purpose: "signup", name: "Akello", token: "bad" })).status, 403);
  const sent = await call("/customers/code", { phone: number, purpose: "signup", name: "Akello", token: "good-token" });
  assert.equal(sent.status, 200);
  assert.match(sent.body.demoCode, /^\d{6}$/);
  const wrong = sent.body.demoCode === "000000" ? "111111" : "000000";
  assert.equal((await call("/customers/verify", { phone: number, code: wrong })).body.triesLeft, 2);
  assert.equal((await call("/customers/verify", { phone: number, code: wrong })).body.triesLeft, 1);
  const third = await call("/customers/verify", { phone: number, code: wrong });
  assert.equal(third.status, 429);
  assert.equal((await call("/customers/verify", { phone: number, code: sent.body.demoCode })).status, 410);

  const again = await call("/customers/code", { phone: number, purpose: "signup", name: "Akello", token: "good-token" });
  assert.equal((await call("/customers/verify", { phone: number, code: again.body.demoCode })).status, 400);
  const made = await call("/customers/verify", { phone: number, code: again.body.demoCode, acceptTerms: true });
  assert.equal(made.status, 201);
  assert.equal(made.body.customer.name, "Akello");
  assert.ok(made.body.customer.termsAccepted.at);
  assert.equal((await request("/me", null, made.body.token)).body.phone, "0789 111 222");

  assert.equal((await call("/customers/code", { phone: number, purpose: "signup", name: "Twin", token: "good-token" })).status, 409);
  assert.equal((await call("/customers/code", { phone: "0789 999 999", purpose: "signin", token: "good-token" })).status, 404);
  const signin = await call("/customers/code", { phone: number, purpose: "signin", token: "good-token" });
  const back = await call("/customers/verify", { phone: number, code: signin.body.demoCode });
  assert.equal(back.status, 200);
  assert.equal(back.body.customer.name, "Akello");
});

test("B: a vendor applies with proof, services and the agreement; rejected with a reason; resubmits; approved", async () => {
  const applied = await call("/vendors/apply", { business: "Gulu Grill House", owner: "Okot James", category: "catering", district: "Gulu", phone: "0772 333 444", email: "grill@example.com", password: "a strong one", token: "good-token" });
  assert.equal(applied.status, 201);
  const me = (path, data) => request(path, data, applied.body.token);
  assert.equal((await me("/vendor/overview")).status, 403);
  assert.deepEqual((await me("/vendor/application")).body.missing, ["proof", "photos", "services", "agreement"]);

  const upload = async (purpose, type = "image/png") => (await me("/uploads", { purpose, name: `${purpose}.png`, type, data: PNG })).body;
  assert.equal((await me("/uploads", { purpose: "proof", name: "x.exe", type: "application/x-msdownload", data: PNG })).status, 400);
  const certificate = await upload("proof");
  const photo = await upload("work");
  await me("/vendor/application/documents", { certificate: certificate.id, workPhotos: [photo.id] });
  const service = await me("/vendor/services", { category: "catering", name: "Northern grill platter", price: 30000, wasPrice: 35000, unit: "plate", qtyRule: "perGuest", labour: 300000, transport: 200000, included: "Goat, chicken and beef\nKalo and greens" });
  assert.equal(service.status, 201);
  assert.deepEqual(service.body.included, ["Goat, chicken and beef", "Kalo and greens"]);
  assert.equal((await me("/vendor/services", { category: "catering", name: "Bad discount", price: 30000, wasPrice: 20000, unit: "plate", qtyRule: "perGuest" })).status, 400);
  assert.equal((await me("/vendor/application/submit", {})).status, 400);
  assert.equal((await me("/vendor/application/agreement", { accept: true, name: "Okot James" })).status, 200);
  const submitted = await me("/vendor/application/submit", {});
  assert.equal(submitted.body.vendor.status, "pending");

  // Documents are private; work photos are public.
  assert.equal((await call(`/uploads/${certificate.id}`)).status, 404);
  assert.equal((await admin(`/uploads/${certificate.id}`)).status, 200);
  assert.equal((await call(`/uploads/${photo.id}`)).status, 200);
  const queue = (await admin("/admin/applications")).body.find((v) => v.id === "gulu-grill-house");
  assert.equal(queue.contacts.phone, "0772333444");
  assert.equal(queue.proofs.certificate.id, certificate.id);
  assert.equal(queue.services.length, 1);
  assert.ok(!(await call("/services?category=catering")).body.some((s) => s.vendor === "Gulu Grill House"));

  assert.equal((await admin("/admin/vendors/gulu-grill-house", { action: "reject" })).status, 400);
  await admin("/admin/vendors/gulu-grill-house", { action: "reject", reason: "The certificate is blurred. Upload a clear copy." });
  const rejected = (await me("/vendor/application")).body.vendor;
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.review.reason, "The certificate is blurred. Upload a clear copy.");
  const clearer = await upload("proof");
  await me("/vendor/application/documents", { certificate: clearer.id });
  assert.equal((await me("/vendor/application/submit", {})).body.vendor.status, "pending");
  await admin("/admin/vendors/gulu-grill-house", { action: "approve" });

  const live = (await call("/services?category=catering")).body.find((s) => s.vendor === "Gulu Grill House");
  assert.equal(live.price, 30000);
  assert.equal(live.wasPrice, 35000);
  assert.equal((await me("/vendor/overview")).status, 200);
  const detail = (await call(`/services/${live.id}`)).body;
  assert.ok(detail.options.some((o) => o.id === "menu"));
});

test("C: filters, the event location, and similar vendors when one is taken", async () => {
  const kampala = (await call("/services?district=Kampala")).body;
  assert.ok(kampala.length && kampala.every((s) => s.district === "Kampala"));
  assert.ok((await call("/services?minRating=4.8")).body.every((s) => s.rating >= 4.8));
  assert.ok((await call("/services?maxPrice=200000&category=cakes")).body.every((s) => s.price <= 200000));
  const sorted = (await call("/services?category=catering&sort=price")).body.map((s) => s.price);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a - b));

  const caterer = as({ role: "vendor", vendor: "mama-s-kitchen" });
  const day = nextFreeDate(["buffet"], dayOffset(90));
  await caterer("/vendor/busy", { date: day, busy: true });
  const check = (await call("/availability", { date: day, items: ["buffet", "pa-dj"] })).body;
  assert.deepEqual(check.unavailable, ["buffet"]);
  assert.ok(check.similar.buffet.length > 0);
  assert.ok(check.similar.buffet.every((s) => s.id !== "buffet"));
  await caterer("/vendor/busy", { date: day, busy: false });

  assert.equal((await call("/quote", { event: event(day, { location: "x".repeat(200) }), items: ["buffet"] })).status, 400);
});

test("Settings: each service's options change its price", async () => {
  const day = dayOffset(60);
  const plain = (await call("/quote", { event: event(day), items: ["buffet"] })).body.lines[0];
  assert.equal(plain.amount, 35000 * 250);
  const served = (await call("/quote", { event: event(day), items: ["buffet"], choices: { buffet: { service: "served", extras: ["dessert"], diet: "20 vegetarian. Call 0770 111 222" } } })).body.lines[0];
  assert.equal(served.amount, (35000 + 5000 + 4000) * 250);
  assert.equal(served.choices.diet, "20 vegetarian. Call [number removed]");
  assert.match(served.settings, /Served at the table/);
  const cake = (await call("/quote", { event: event(day), items: ["wedding-cake"], choices: { "wedding-cake": { size: "bigger", extras: ["topper"], size2: "nonsense" } } })).body.lines[0];
  assert.equal(cake.amount, 900000 * 1.4 + 50000);
  const junk = (await call("/quote", { event: event(day), items: ["buffet"], choices: { buffet: { service: "free food" } } })).body.lines[0];
  assert.equal(junk.amount, plain.amount);
});

test("D: the payment waits for the phone; a failure can be retried; success notifies everyone", async () => {
  const day = nextFreeDate(["luwombo", "pa-only"], dayOffset(45));
  assert.equal((await call("/bookings", { event: event(day), items: ["luwombo"], payment, deposit: true, prompt: true })).status, 401);
  const me = await host("Sarah");
  const made = await me.call("/bookings", { event: event(day), items: ["luwombo", "pa-only"], payment, deposit: true, prompt: true, choices: { luwombo: { service: "served" } } });
  assert.equal(made.body.status, "awaiting_payment");
  assert.equal(made.body.paid, 0);
  assert.equal(made.body.quote.lines[0].amount, (48000 + 5000) * 250);
  assert.equal(made.body.event.location, "Seeta, near the church");
  const first = made.body.payments[0];
  assert.equal((await me.call(`/payments/${first.id}`)).body.status, "pending");
  assert.equal((await call(`/verify-nothing`)).status, 404);
  assert.equal((await call(`/bookings/${made.body.id}/verify`)).status, 404);

  const failed = await me.call(`/payments/${first.id}/simulate`, { outcome: "failed" });
  assert.equal(failed.body.status, "failed");
  assert.ok(failed.body.reason);
  assert.equal((await me.call(`/bookings/${made.body.id}`)).body.status, "awaiting_payment");

  const retry = await me.call(`/bookings/${made.body.id}/payments`, { kind: "deposit", payment: { method: "airtel", phone: "0750 000 000" } });
  assert.equal(retry.status, 201);
  assert.equal((await me.call(`/bookings/${made.body.id}/payments`, { kind: "deposit", payment })).status, 409);
  // A simulated payment approves itself after a few seconds, as if the PIN were entered.
  const stored = await read("bookings", []);
  stored.find((b) => b.id === made.body.id).payments.at(-1).createdAt = new Date(Date.now() - 10000).toISOString();
  await write("bookings", stored);
  const paid = (await me.call(`/bookings/${made.body.id}`)).body;
  assert.equal(paid.status, "active");
  assert.equal(paid.paid, Math.round(paid.total * 0.3));
  assert.equal(paid.method, "Airtel Money");
  assert.ok(paid.vendors.every((v) => v.status === "Confirmed" || Date.parse(v.respondBy) - Date.now() > 23 * 3600000));
  assert.ok((await me.call("/me/notifications")).body.some((n) => n.text.startsWith("Payment of")));
  assert.ok((await as({ role: "vendor", vendor: "ssenga-s-pot" })("/vendor/overview")).body.notifications.some((n) => n.text.includes(made.body.id)));

  const balance = await me.call(`/bookings/${made.body.id}/payments`, { kind: "balance", payment });
  await me.call(`/payments/${balance.body.id}/simulate`, { outcome: "succeeded" });
  const full = (await me.call(`/bookings/${made.body.id}`)).body;
  assert.equal(full.balance, 0);
  assert.equal(full.paid, full.total);
});

test("E: accept within 24 hours, reminders, delivered on the day, confirmed or auto-confirmed, then paid out", async () => {
  const me = await host("Brenda");
  const today = new Date().toISOString().slice(0, 10);
  const items = ["cocktail-bar", "photo-full-day"];
  const day = nextFreeDate(items, today);
  assert.equal(day, today, "both free today");
  const booking = await bookAndPay(me, items, day);
  const shaker = as({ role: "vendor", vendor: "shake-and-stir-ug" });
  const studio = as({ role: "vendor", vendor: "crane-eye-studio" });
  assert.ok((await me.call("/me/notifications")).body.some((n) => n.text.startsWith("Tomorrow") || n.text.startsWith("In 7 days")));

  assert.equal((await shaker(`/vendor/bookings/${booking.id}/lines/cocktail-bar/delivered`, {})).status, 400, "must accept first");
  await shaker(`/vendor/bookings/${booking.id}/status`, { serviceId: "cocktail-bar", status: "Confirmed" });
  assert.equal((await shaker(`/vendor/bookings/${booking.id}/lines/cocktail-bar/delivered`, {})).status, 200);
  assert.equal((await studio(`/vendor/bookings/${booking.id}/lines/photo-full-day/delivered`, {})).status, 200);

  // The host confirms one; the other confirms itself 48 hours after delivery.
  const confirmed = (await me.call(`/bookings/${booking.id}/lines/cocktail-bar/confirm`, {})).body;
  const juice = confirmed.vendors.find((v) => v.serviceId === "cocktail-bar");
  assert.equal(juice.payout.status, "paid");
  assert.equal(juice.payout.amount, confirmed.quote.lines.find((l) => l.id === "cocktail-bar").due);
  const stored = await read("bookings", []);
  stored.find((b) => b.id === booking.id).vendors.find((v) => v.serviceId === "photo-full-day").deliveredAt = new Date(Date.now() - 49 * 3600000).toISOString();
  await write("bookings", stored);
  const later = (await me.call(`/bookings/${booking.id}`)).body.vendors.find((v) => v.serviceId === "photo-full-day");
  assert.equal(later.autoConfirmed, true);
  assert.equal(later.payout.status, "paid");
  assert.equal(later.payout.amount, 750000);

  // A future event cannot be marked delivered yet.
  const future = await bookAndPay(await host("Joan"), ["party-cake"], nextFreeDate(["party-cake"], dayOffset(20)));
  assert.equal((await as({ role: "vendor", vendor: "mukono-bakehouse" })(`/vendor/bookings/${future.id}/lines/party-cake/delivered`, {})).status, 400);
});

test("F: the host cancels and the refund follows how early it is", async () => {
  for (const [days, rate] of [[40, 1], [15, 0.5], [3, 0]]) {
    const me = await host("Canceller");
    const date = nextFreeDate(["lawn-games"], dayOffset(days));
    if (date !== dayOffset(days)) continue; // the rule depends on the exact day
    const booking = await bookAndPay(me, ["lawn-games"], date);
    const preview = (await me.call(`/bookings/${booking.id}/cancellation`)).body;
    assert.equal(preview.rule.rate, rate);
    assert.equal((await me.call(`/bookings/${booking.id}/cancel`, {})).status, 400);
    const cancelled = (await me.call(`/bookings/${booking.id}/cancel`, { reason: "We have moved the event." })).body;
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.cancellation.refund, Math.round(booking.paid * rate));
    assert.equal(cancelled.refunds.reduce((sum, r) => sum + r.amount, 0), Math.round(booking.paid * rate));
    assert.deepEqual((await call("/availability", { date, items: ["lawn-games"] })).body.unavailable, []);
  }
});

test("F: a vendor cancels; the admin offers a replacement or a full refund", async () => {
  const me = await host("Grace");
  const day = nextFreeDate(["kwanjula-cake", "mc-bilingual"], dayOffset(50));
  const booking = await bookAndPay(me, ["kwanjula-cake", "mc-bilingual"], day);
  const bakery = as({ role: "vendor", vendor: "sweet-crumbs" });
  await bakery(`/vendor/bookings/${booking.id}/status`, { serviceId: "kwanjula-cake", status: "Confirmed" });
  assert.equal((await bakery(`/vendor/bookings/${booking.id}/lines/kwanjula-cake/cancel`, { reason: "" })).status, 400);
  await bakery(`/vendor/bookings/${booking.id}/lines/kwanjula-cake/cancel`, { reason: "Our oven has broken down." });
  let cases = (await admin("/admin/overview")).body.cases.filter((c) => c.bookingId === booking.id);
  assert.equal(cases[0].type, "vendor-cancel");
  const options = (await admin(`/admin/cases/${cases[0].id}/replacements`)).body;
  assert.ok(options.length && options.every((o) => o.id !== "kwanjula-cake"));
  const replaced = await admin(`/admin/cases/${cases[0].id}/resolve`, { action: "replacement", serviceId: options[0].id });
  assert.equal(replaced.body.status, "resolved");
  let now = (await me.call(`/bookings/${booking.id}`)).body;
  assert.equal(now.total, booking.total, "the host pays the same");
  assert.equal(now.vendors.find((v) => v.serviceId === "kwanjula-cake").status, "Replaced");
  assert.equal(now.vendors.find((v) => v.serviceId === options[0].id).status, "Waiting");

  const mc = as({ role: "vendor", vendor: "mc-kato" });
  await mc(`/vendor/bookings/${booking.id}/status`, { serviceId: "mc-bilingual", status: "Declined", reason: "Double booked, sorry." });
  cases = (await admin("/admin/overview")).body.cases.filter((c) => c.bookingId === booking.id && c.status === "open");
  await admin(`/admin/cases/${cases[0].id}/resolve`, { action: "refund" });
  now = (await me.call(`/bookings/${booking.id}`)).body;
  const allIn = Math.round(booking.quote.lines.find((l) => l.id === "mc-bilingual").due * 1.03);
  assert.equal(now.total, booking.total - allIn);
  assert.equal(now.balance, now.total - now.paid);
  assert.equal(now.vendors.find((v) => v.serviceId === "mc-bilingual").status, "Refunded");
});

test("F: a complaint after the event holds the payout, both sides give evidence, the admin decides", async () => {
  const me = await host("Faith");
  const today = new Date().toISOString().slice(0, 10);
  const day = nextFreeDate(["bouncing-castle"], today);
  if (day !== today) return;
  const booking = await bookAndPay(me, ["bouncing-castle"], day);
  const jump = as({ role: "vendor", vendor: "jump-uganda" });
  await jump(`/vendor/bookings/${booking.id}/status`, { serviceId: "bouncing-castle", status: "Confirmed" });
  await jump(`/vendor/bookings/${booking.id}/lines/bouncing-castle/delivered`, {});

  const photo = (await me.call("/uploads", { purpose: "evidence", name: "torn.png", type: "image/png", data: PNG })).body;
  assert.equal((await me.call(`/bookings/${booking.id}/lines/bouncing-castle/complaint`, { text: "bad" })).status, 400);
  const complaint = await me.call(`/bookings/${booking.id}/lines/bouncing-castle/complaint`, { text: "The castle was torn and went flat after an hour.", evidence: [photo.id] });
  assert.equal(complaint.status, 201);
  const due = new Date(complaint.body.dueBy);
  assert.ok(due - Date.now() >= 3 * 86400000 - 60000, "three working days at least");
  assert.equal((await me.call(`/bookings/${booking.id}/lines/bouncing-castle/confirm`, {})).status, 400, "held while reviewed");
  assert.equal((await jump(`/uploads/${photo.id}`)).status, 200, "the vendor sees the evidence");
  assert.equal((await as({ role: "vendor", vendor: "play-day-hire" })(`/uploads/${photo.id}`)).status, 404);

  const reply = (await jump("/uploads", { purpose: "evidence", name: "receipt.png", type: "image/png", data: PNG })).body;
  assert.equal((await jump(`/vendor/cases/${complaint.body.id}/respond`, { text: "It was whole when we set it up; a child cut it.", evidence: [reply.id] })).status, 200);
  assert.equal((await me.call(`/uploads/${reply.id}`)).status, 200, "the host sees the vendor's evidence");
  const seen = (await admin("/admin/overview")).body.cases.find((c) => c.id === complaint.body.id);
  assert.equal(seen.evidence[0].id, photo.id);
  assert.equal(seen.response.evidence[0].id, reply.id);

  assert.equal((await admin(`/admin/cases/${complaint.body.id}/resolve`, { action: "refund", amount: 999999999 })).status, 400);
  await admin(`/admin/cases/${complaint.body.id}/resolve`, { action: "refund", amount: 50000 });
  const after = (await me.call(`/bookings/${booking.id}`)).body;
  assert.equal(after.refunds.at(-1).amount, 50000);
  const line = after.vendors.find((v) => v.serviceId === "bouncing-castle");
  assert.equal(line.payout.status, "paid");
  assert.equal(line.payout.amount, after.quote.lines[0].due - 50000);
});

test("Areas: a place outside the list can be typed, and browsing can filter for it", async () => {
  const day = dayOffset(70);
  const quote = await call("/quote", { event: event(day, { district: "Kalangala" }), items: ["party-cake"] });
  assert.equal(quote.status, 200);
  assert.equal((await call("/quote", { event: event(day, { district: "<script>" }), items: ["party-cake"] })).status, 400);
  const applied = await call("/vendors/apply", { business: "Island Tents", owner: "Ssekandi", category: "tents", district: "  Kalangala ", phone: "0772 999 000", password: "a strong one", token: "good-token" });
  assert.equal(applied.body.vendor.district, "Kalangala");
  assert.equal((await call("/services?district=other")).body.filter((s) => s.district === "Mukono").length, 0);
});

test("Live-backend routes: health, a host's data download and account deletion, and the admin audit log", async () => {
  assert.equal((await call("/health")).body.ok, true);

  const { customer, call: mine } = await host("Akello");
  const data = await mine("/me/data");
  assert.equal(data.status, 200);
  assert.equal(data.body.account.id, customer.id);
  assert.ok(Array.isArray(data.body.bookings));

  assert.equal((await mine("/me/delete", {})).status, 400, "deleting needs confirm: true");
  assert.equal((await mine("/me/delete", { confirm: true })).status, 200);
  assert.equal((await mine("/me")).status, 401, "the deleted account can no longer sign in");

  const wrong = await call("/staff/login", { role: "admin", password: "wrong", token: "good-token" });
  assert.equal(wrong.status, 401);
  await admin("/admin/customers/nobody", { action: "suspend" });
  // Entries are written as each response finishes.
  await new Promise((resolve) => setTimeout(resolve, 50));
  const audit = await admin("/admin/audit");
  assert.equal(audit.status, 200);
  assert.ok(audit.body.some((e) => e.action === "me/delete" && e.actor === `customer:${customer.id}`));
  assert.ok(audit.body.some((e) => e.action === "staff/login" && e.outcome.startsWith("refused")));
  assert.ok(audit.body.some((e) => e.actor === "admin" && e.action === "admin/customers/nobody"));
  assert.equal((await call("/admin/audit")).status, 401, "only the admin sees the log");
});
