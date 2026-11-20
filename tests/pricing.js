import test from "node:test";
import assert from "node:assert/strict";
import { SERVICES } from "../server/data.js";
import { buildQuote, validateEvent } from "../server/pricing.js";

const pick = (...ids) => ids.map((id) => SERVICES.find((service) => service.id === id));
const event = { type: "Kwanjula", guests: 250, tents: 6, date: "2026-12-12", district: "Mukono", setup: "vendor" };
const plan = pick("lakeside-hall-gardens", "draped-tent-100", "buffet", "pa-dj", "photo-full-day");

test("the wireframe's sample plan adds up to its grand total", () => {
  const quote = buildQuote(plan, event);
  assert.equal(quote.itemCost, 14850000);
  assert.equal(quote.labour, 1200000);
  assert.equal(quote.transport, 450000);
  assert.equal(quote.platformFee, 495000);
  assert.equal(quote.total, 16995000);
});

test("doing setup yourself removes the labour charge", () => {
  const quote = buildQuote(plan, { ...event, setup: "self" });
  assert.equal(quote.labour, 0);
  assert.equal(quote.total, 15300000 + Math.round(15300000 * 0.03));
});

test("event details are checked", () => {
  const today = new Date("2026-11-15");
  assert.deepEqual(validateEvent(event, today), []);
  assert.equal(validateEvent({ ...event, guests: 0 }, today).length, 1);
  assert.equal(validateEvent({ ...event, date: "2026-01-01" }, today).length, 1);
  assert.equal(validateEvent({ ...event, district: "12 && <b>" }, today).length, 1);
  assert.deepEqual(validateEvent({ ...event, district: "Kalangala" }, today), [], "a place typed under Other");
});
