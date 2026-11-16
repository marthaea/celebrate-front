import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import { nextFreeDate } from "../server/availability.js";

// Runs the real API on a spare port and calls it the way the website does.
const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
test.after(() => server.close());

const call = async (path, data) => {
  const response = await fetch(base + path, data && { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return { status: response.status, body: await response.json() };
};

const items = ["lakeside-hall-gardens", "draped-tent-100", "buffet", "pa-dj", "photo-full-day"];
const date = nextFreeDate(items, "2027-03-01");
const event = { type: "Kwanjula", guests: 250, tents: 6, date, district: "Mukono", setup: "vendor" };
const payment = { method: "mtn", phone: "0770 000 000" };

test("a booking takes a 30% deposit, then the balance, and the date is then taken", async () => {
  const made = await call("/bookings", { event, items, payment, customer: "Nantongo", deposit: true });
  assert.equal(made.status, 201);
  assert.equal(made.body.total, 16995000);
  assert.equal(made.body.paid, 5098500);
  assert.equal(made.body.balance, 11896500);

  const again = await call("/bookings", { event, items: ["buffet"], payment, deposit: true });
  assert.equal(again.status, 409);

  const badPhone = await call(`/bookings/${made.body.id}/balance`, { payment: { method: "mtn", phone: "123" } });
  assert.equal(badPhone.status, 400);
  const settled = await call(`/bookings/${made.body.id}/balance`, { payment });
  assert.equal(settled.body.paid, 16995000);
  assert.equal(settled.body.balance, 0);
  assert.equal((await call(`/bookings/${made.body.id}/balance`, { payment })).status, 400);
});

test("without the deposit option the whole amount is paid, as the phone app expects", async () => {
  const other = { ...event, date: nextFreeDate(["party-cake"], "2027-04-01") };
  const made = await call("/bookings", { event: other, items: ["party-cake"], payment });
  assert.equal(made.status, 201);
  assert.equal(made.body.balance, 0);
  assert.equal(made.body.paid, made.body.quote.total);
});

test("messages reach only vendors on the booking and lose phone numbers", async () => {
  const other = { ...event, date: nextFreeDate(["luwombo"], "2027-05-01") };
  const { body: booking } = await call("/bookings", { event: other, items: ["luwombo"], payment, deposit: true });
  assert.equal((await call(`/bookings/${booking.id}/messages`, { serviceId: "buffet", text: "Hello" })).status, 400);
  const sent = await call(`/bookings/${booking.id}/messages`, { serviceId: "luwombo", text: "Ring 0770 123 456" });
  assert.equal(sent.status, 201);
  assert.equal(sent.body[0].text, "Ring [number removed]");
  assert.equal(sent.body[1].from, "system");
  assert.equal((await call(`/bookings/${booking.id}/messages`)).body.length, 2);
});

test("an appointment takes its time slot, and cancelling frees it", async () => {
  const day = nextFreeDate(["bridal-gown"], "2027-02-01");
  const before = (await call(`/services/bridal-gown/slots?date=${day}`)).body;
  assert.equal(before.kind, "Fitting");
  assert.equal(before.free.length, 7);
  const visit = await call("/appointments", { serviceId: "bridal-gown", date: day, time: "10:00", name: "Nantongo" });
  assert.equal(visit.status, 201);
  assert.equal((await call("/appointments", { serviceId: "bridal-gown", date: day, time: "10:00", name: "Other" })).status, 409);
  assert.equal((await call(`/services/bridal-gown/slots?date=${day}`)).body.free.length, 6);
  assert.equal((await call("/appointments", { serviceId: "bridal-gown", date: "2020-01-01", time: "10:00", name: "A" })).status, 400);
  await call(`/appointments/${visit.body.id}/cancel`, {});
  assert.equal((await call(`/services/bridal-gown/slots?date=${day}`)).body.free.length, 7);
});

test("logging in needs a name and the security check", async () => {
  assert.equal((await call("/login", { name: "", token: "x" })).status, 400);
  assert.equal((await call("/login", { name: "Nantongo", token: "" })).status, 400);
});

// ---- Vendors, admin and reviews. Sign-in itself needs Cloudflare, so these tests mint their own tokens.
const { makeToken, readToken, hashPassword, checkPassword } = await import("../server/staff.js");
const as = (claims) => async (path, data) => {
  const response = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${makeToken(claims)}` },
    body: data && JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
};
const admin = as({ role: "admin" });
const caterer = as({ role: "vendor", vendor: "mama-s-kitchen" });

test("passwords are hashed and tokens cannot be forged", () => {
  const stored = hashPassword("correct horse");
  assert.ok(!stored.includes("correct horse"));
  assert.ok(checkPassword("correct horse", stored));
  assert.ok(!checkPassword("wrong horse", stored));
  const token = makeToken({ role: "vendor", vendor: "mama-s-kitchen" });
  assert.equal(readToken(token).vendor, "mama-s-kitchen");
  const [body] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ role: "admin", exp: Date.now() + 100000 })).toString("base64url");
  assert.equal(readToken(`${forged}.${token.split(".")[1]}`), null);
  assert.equal(readToken(`${body}.nonsense`), null);
});

test("the vendor and admin areas are closed without the right sign-in", async () => {
  assert.equal((await call("/admin/overview")).status, 401);
  assert.equal((await call("/vendor/overview")).status, 401);
  assert.equal((await caterer("/admin/overview")).status, 401);
  assert.equal((await admin("/vendor/overview")).status, 401);
});

test("a vendor's busy date takes them off the calendar for customers", async () => {
  const day = "2027-08-14";
  assert.deepEqual((await call("/availability", { date: day, items: ["buffet"] })).body.unavailable, []);
  assert.equal((await caterer("/vendor/busy", { date: day, busy: true })).status, 200);
  const blocked = await call("/availability", { date: day, items: ["buffet", "pa-dj"] });
  assert.deepEqual(blocked.body.unavailable, ["buffet"]);
  assert.notEqual(blocked.body.nextFree, day);
  assert.ok((await call("/services/buffet/availability?month=2027-08")).body.booked.includes(day));
  await caterer("/vendor/busy", { date: day, busy: false });
  assert.deepEqual((await call("/availability", { date: day, items: ["buffet"] })).body.unavailable, []);
});

test("a vendor sees and answers only their own bookings, and the customer sees the answer", async () => {
  const date2 = nextFreeDate(["buffet", "pa-dj"], "2027-09-01");
  const { body: booking } = await call("/bookings", { event: { ...event, date: date2 }, items: ["buffet", "pa-dj"], payment, customer: "Nantongo", deposit: true });
  const mine = (await caterer("/vendor/overview")).body;
  const seen = mine.bookings.find((b) => b.id === booking.id);
  assert.deepEqual(seen.lines.map((line) => line.id), ["buffet"]);
  assert.equal(seen.lines[0].status, "Waiting");
  assert.equal(seen.lines[0].due, 9500000);

  assert.equal((await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "pa-dj", status: "Confirmed" })).status, 403);
  assert.equal((await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "buffet", status: "Confirmed" })).status, 200);
  const after = (await call(`/bookings/${booking.id}`)).body;
  assert.equal(after.vendors.find((v) => v.serviceId === "buffet").status, "Confirmed");

  await call(`/bookings/${booking.id}/messages`, { serviceId: "buffet", text: "Can we have matooke?" });
  const reply = await caterer(`/vendor/bookings/${booking.id}/messages`, { serviceId: "buffet", text: "Yes. Call 0770 111 222" });
  assert.equal(reply.status, 201);
  const thread = (await call(`/bookings/${booking.id}/messages`)).body;
  assert.equal(thread.at(-1).from, "vendor");
  assert.equal(thread.at(-1).text, "Yes. Call [number removed]");

  // Declining frees the date again.
  await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "buffet", status: "Declined" });
  assert.deepEqual((await call("/availability", { date: date2, items: ["buffet"] })).body.unavailable, []);
});

test("a vendor approves an appointment for their own service only", async () => {
  const day = nextFreeDate(["buffet"], "2027-02-10");
  const { body: visit } = await call("/appointments", { serviceId: "buffet", date: day, time: "11:00", name: "Nantongo" });
  const tailor = as({ role: "vendor", vendor: "nakato-tailors" });
  assert.equal((await tailor(`/vendor/visits/${visit.id}`, { status: "Confirmed" })).status, 404);
  assert.equal((await caterer(`/vendor/visits/${visit.id}`, { status: "Confirmed" })).status, 200);
  assert.equal((await call(`/appointments?ids=${visit.id}`)).body[0].status, "Confirmed");
});

test("a review needs a finished or fully paid booking, counts once, and moves the rating", async () => {
  const day = nextFreeDate(["party-cake"], "2027-10-01");
  const { body: booking } = await call("/bookings", { event: { ...event, date: day }, items: ["party-cake"], payment, customer: "Nantongo", deposit: true });
  const early = await call(`/bookings/${booking.id}/reviews`, { serviceId: "party-cake", rating: 5, text: "Lovely" });
  assert.equal(early.status, 403);
  await call(`/bookings/${booking.id}/balance`, { payment });
  const before = (await call("/services/party-cake")).body;
  assert.equal((await call(`/bookings/${booking.id}/reviews`, { serviceId: "party-cake", rating: 9 })).status, 400);
  const made = await call(`/bookings/${booking.id}/reviews`, { serviceId: "party-cake", rating: 1, text: "Late. Ring me on 0770 555 666" });
  assert.equal(made.status, 201);
  assert.equal(made.body.text, "Late. Ring me on [number removed]");
  assert.equal((await call(`/bookings/${booking.id}/reviews`, { serviceId: "party-cake", rating: 5 })).status, 409);
  const after = (await call("/services/party-cake")).body;
  assert.equal(after.reviews, before.reviews + 1);
  assert.ok(after.rating < before.rating);
  assert.equal((await call("/services/party-cake/reviews")).body[0].bookingId, undefined);

  assert.equal((await admin(`/admin/reviews/${made.body.id}/remove`, {})).status, 200);
  assert.equal((await call("/services/party-cake")).body.rating, before.rating);
});

test("the admin adds, suspends and restores vendors, and tracks payments", async () => {
  const added = await admin("/admin/vendors", { business: "Test Florists", owner: "Akello", category: "venues", district: "Jinja", password: "long enough" });
  assert.equal(added.status, 201);
  assert.equal(added.body.passHash, undefined);
  assert.equal((await as({ role: "vendor", vendor: "test-florists" })("/vendor/overview")).status, 200);

  assert.equal((await admin("/admin/vendors/sweet-crumbs", { action: "suspend" })).body.status, "suspended");
  assert.ok(!(await call("/services?category=cakes")).body.some((s) => s.vendor === "Sweet Crumbs"));
  assert.equal((await call("/services/wedding-cake")).status, 404);
  assert.equal((await as({ role: "vendor", vendor: "sweet-crumbs" })("/vendor/overview")).status, 403);
  const day = nextFreeDate(["wedding-cake"], "2027-11-01");
  assert.equal((await call("/bookings", { event: { ...event, date: day }, items: ["wedding-cake"], payment })).status, 409);
  await admin("/admin/vendors/sweet-crumbs", { action: "restore" });
  assert.equal((await call("/services/wedding-cake")).status, 200);

  const overview = (await admin("/admin/overview")).body;
  assert.equal(overview.totals.collected, overview.bookings.reduce((sum, b) => sum + b.paid, 0));
  assert.equal(overview.totals.value, overview.totals.collected + overview.totals.outstanding);
  const line = overview.payouts.find((p) => p.status !== "Declined" && !p.paidOut);
  await admin("/admin/payouts", { bookingId: line.bookingId, serviceId: line.serviceId, paid: true });
  const later = (await admin("/admin/overview")).body;
  assert.equal(later.totals.owedToVendors, overview.totals.owedToVendors - line.due);
  assert.equal(later.totals.paidToVendors, overview.totals.paidToVendors + line.due);
});
