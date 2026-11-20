import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import { nextFreeDate } from "../server/availability.js";

// Runs the real API on a spare port and calls it the way the website does.
const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
test.after(() => server.close());

const request = async (path, data, token) => {
  const response = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: data && JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
};
const call = (path, data) => request(path, data);

// Customer accounts. Signing up through the API needs Cloudflare, so tests create accounts directly.
const { createCustomer } = await import("../server/customers.js");
const { makeToken: tokenFor } = await import("../server/auth.js");
let phoneCounter = 100000;
async function newCustomer(name = "Nantongo") {
  const { customer } = await createCustomer({ name, phone: `0770${phoneCounter++}` });
  const token = tokenFor({ role: "customer", customer: customer.id }, 1);
  return { customer, token, call: (path, data) => request(path, data, token) };
}

const items = ["lakeside-hall-gardens", "draped-tent-100", "buffet", "pa-dj", "photo-full-day"];
const date = nextFreeDate(items, "2027-03-01");
const event = { type: "Introduction", guests: 250, tents: 6, date, district: "Mukono", setup: "vendor" };
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
  assert.equal((await call("/appointments", { serviceId: "bridal-gown", date: day, time: "10:00" })).status, 401);
  const bride = await newCustomer("Nantongo");
  const visit = await bride.call("/appointments", { serviceId: "bridal-gown", date: day, time: "10:00" });
  assert.equal(visit.status, 201);
  assert.equal(visit.body.name, "Nantongo");
  const other = await newCustomer("Other");
  assert.equal((await other.call("/appointments", { serviceId: "bridal-gown", date: day, time: "10:00" })).status, 409);
  assert.equal((await call(`/services/bridal-gown/slots?date=${day}`)).body.free.length, 6);
  assert.equal((await bride.call("/appointments", { serviceId: "bridal-gown", date: "2020-01-01", time: "10:00" })).status, 400);
  assert.equal((await other.call(`/appointments/${visit.body.id}/cancel`, {})).status, 404);
  assert.deepEqual((await other.call(`/appointments?ids=${visit.body.id}`)).body, []);
  assert.equal((await bride.call("/me/appointments")).body.length, 1);
  await bride.call(`/appointments/${visit.body.id}/cancel`, {});
  assert.equal((await call(`/services/bridal-gown/slots?date=${day}`)).body.free.length, 7);
});

test("signing up and in need the security check", async () => {
  assert.equal((await call("/customers/code", { name: "A", phone: "0770 000 001", purpose: "signup", token: "" })).status, 400);
  assert.equal((await call("/customers/code", { phone: "0770 000 001", purpose: "signin", token: "" })).status, 400);
});

test("accounts check the phone number, and refuse a second account for one number", async () => {
  const { normalisePhone } = await import("../server/customers.js");
  assert.equal(normalisePhone("0770 123 456"), "256770123456");
  assert.equal(normalisePhone("+256 770-123456"), "256770123456");
  assert.equal(normalisePhone("0414 123 456"), null);
  assert.equal((await createCustomer({ name: "A", phone: "12345" })).status, 400);
  assert.equal((await createCustomer({ name: "", phone: "0781 000 000" })).status, 400);
  const made = await createCustomer({ name: "Akello", phone: "0781 000 000" });
  assert.equal(made.customer.phone, "256781000000");
  assert.equal(made.customer.passHash, undefined);
  assert.ok(made.customer.termsAccepted.at);
  assert.equal((await createCustomer({ name: "Someone", phone: "+256781000000" })).status, 409);
});

test("a booking made while signed in belongs to that account alone", async () => {
  const owner = await newCustomer("Nakato");
  const stranger = await newCustomer("Stranger");
  const day = nextFreeDate(["juice-station"], "2027-06-01");
  const { body: booking } = await owner.call("/bookings", { event: { ...event, date: day }, items: ["juice-station"], payment, customer: "Someone else", deposit: true });
  assert.equal(booking.customer, "Nakato");
  assert.equal(booking.customerId, owner.customer.id);

  assert.equal((await owner.call(`/bookings/${booking.id}`)).status, 200);
  for (const who of [call, stranger.call]) {
    assert.equal((await who(`/bookings/${booking.id}`)).status, 403);
    assert.equal((await who(`/bookings/${booking.id}/messages`)).status, 403);
    assert.equal((await who(`/bookings/${booking.id}/messages`, { serviceId: "juice-station", text: "hi" })).status, 403);
    assert.equal((await who(`/bookings/${booking.id}/balance`, { payment })).status, 403);
  }
  assert.ok(!(await call("/bookings")).body.some((b) => b.id === booking.id));
  assert.deepEqual((await owner.call("/me/bookings")).body.map((b) => b.id), [booking.id]);
  assert.deepEqual((await stranger.call("/me/bookings")).body, []);

  // A vendor scanning the QR code still sees that it is genuine, without the customer's details.
  const check = await call(`/bookings/${booking.id}/verify`);
  assert.equal(check.status, 200);
  assert.equal(check.body.customerId, undefined);
  assert.equal(check.body.customer, "Nakato");

  assert.equal((await owner.call(`/bookings/${booking.id}/balance`, { payment })).status, 200);
  assert.equal((await stranger.call(`/bookings/${booking.id}/reviews`, { serviceId: "juice-station", rating: 1 })).status, 403);
  assert.equal((await owner.call(`/bookings/${booking.id}/reviews`, { serviceId: "juice-station", rating: 5 })).status, 201);
});

test("customers change their own details, and a suspended account stops working", async () => {
  const me = await newCustomer("Kato");
  assert.equal((await me.call("/me")).body.name, "Kato");
  assert.equal((await me.call("/me")).body.passHash, undefined);
  assert.equal((await me.call("/me", { name: "Kato Moses" })).body.name, "Kato Moses");
  assert.equal((await me.call("/me", { name: "  " })).status, 400);
  assert.equal((await call("/me")).status, 401);
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

  assert.equal((await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "pa-dj", status: "Confirmed" })).status, 404);
  assert.equal((await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "buffet", status: "Confirmed" })).status, 200);
  const after = (await call(`/bookings/${booking.id}`)).body;
  assert.equal(after.vendors.find((v) => v.serviceId === "buffet").status, "Confirmed");

  await call(`/bookings/${booking.id}/messages`, { serviceId: "buffet", text: "Can we have matooke?" });
  const reply = await caterer(`/vendor/bookings/${booking.id}/messages`, { serviceId: "buffet", text: "Yes. Call 0770 111 222" });
  assert.equal(reply.status, 201);
  const thread = (await call(`/bookings/${booking.id}/messages`)).body;
  assert.equal(thread.at(-1).from, "vendor");
  assert.equal(thread.at(-1).text, "Yes. Call [number removed]");

  // Declining needs a reason, opens a case for the admin and frees the date again.
  assert.equal((await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "buffet", status: "Declined" })).status, 400);
  await caterer(`/vendor/bookings/${booking.id}/status`, { serviceId: "buffet", status: "Declined", reason: "Our cook is unwell that week." });
  assert.ok((await admin("/admin/overview")).body.cases.some((c) => c.bookingId === booking.id && c.type === "vendor-cancel" && c.status === "open"));
  assert.deepEqual((await call("/availability", { date: date2, items: ["buffet"] })).body.unavailable, []);
});

test("a vendor approves an appointment for their own service only", async () => {
  const day = nextFreeDate(["buffet"], "2027-02-10");
  const guest = await newCustomer();
  const { body: visit } = await guest.call("/appointments", { serviceId: "buffet", date: day, time: "11:00" });
  const tailor = as({ role: "vendor", vendor: "nakato-tailors" });
  assert.equal((await tailor(`/vendor/visits/${visit.id}`, { status: "Confirmed" })).status, 404);
  assert.equal((await caterer(`/vendor/visits/${visit.id}`, { status: "Confirmed" })).status, 200);
  assert.equal((await guest.call(`/appointments?ids=${visit.id}`)).body[0].status, "Confirmed");
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

test("the admin adds, suspends and restores vendors, and sees the money", async () => {
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

  const someone = await newCustomer("Okello");
  assert.equal((await call("/admin/customers")).status, 401);
  const listed = (await admin("/admin/customers")).body.find((c) => c.id === someone.customer.id);
  assert.equal(listed.passHash, undefined);
  assert.match(listed.phone, /^07\d\d \d{3} \d{3}$/);
  await admin(`/admin/customers/${someone.customer.id}`, { action: "suspend" });
  assert.equal((await someone.call("/me")).status, 401);
  await admin(`/admin/customers/${someone.customer.id}`, { action: "restore" });
  assert.equal((await someone.call("/me")).status, 200);

  const overview = (await admin("/admin/overview")).body;
  assert.equal(overview.totals.collected, overview.bookings.reduce((sum, b) => sum + b.paid, 0));
  assert.equal(overview.totals.outstanding, overview.bookings.reduce((sum, b) => sum + b.balance, 0));
  assert.ok(overview.totals.owedToVendors > 0);
});
