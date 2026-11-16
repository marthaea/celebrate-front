import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, SERVICES } from "../server/data.js";
import { buildQuote, PLATFORM_FEE_RATE } from "../server/pricing.js";
import { nextFreeDate, unavailable } from "../server/availability.js";
import { suggest, totalOf } from "../site/src/budget.js";

const event = { type: "Kwanjula", guests: 250, tents: 6, date: "2026-12-12", district: "Mukono", setup: "vendor" };
const categories = CATEGORIES.map((category) => ({
  ...category,
  options: SERVICES.filter((s) => s.category === category.id)
    .map((s) => {
      const q = buildQuote([s], event);
      return { id: s.id, cost: q.itemCost + q.labour + q.transport };
    })
    .sort((a, b) => a.cost - b.cost),
}));

test("a suggested plan never costs more than the budget", () => {
  for (const budget of [3000000, 8000000, 12000000, 20000000, 60000000]) {
    const picks = suggest(categories, budget, "Kwanjula", PLATFORM_FEE_RATE);
    assert.ok(totalOf(picks, PLATFORM_FEE_RATE) <= budget, `over budget at ${budget}`);
  }
});

test("the planner's total matches the real quote for the same services", () => {
  const picks = suggest(categories, 15000000, "Kwanjula", PLATFORM_FEE_RATE);
  const services = Object.values(picks).map((option) => SERVICES.find((s) => s.id === option.id));
  assert.equal(totalOf(picks, PLATFORM_FEE_RATE), buildQuote(services, event).total);
});

test("a bigger budget fills more and better, and the most important categories come first", () => {
  const small = suggest(categories, 3000000, "Kwanjula", PLATFORM_FEE_RATE);
  const large = suggest(categories, 60000000, "Kwanjula", PLATFORM_FEE_RATE);
  assert.ok(small.tents, "tents come first for a kwanjula");
  assert.ok(Object.keys(large).length > Object.keys(small).length);
  assert.equal(Object.keys(large).length, categories.length);
  for (const category of categories) assert.equal(large[category.id], category.options.at(-1));
});

test("a budget too small for anything gives an empty plan", () => {
  assert.deepEqual(suggest(categories, 100000, "Kwanjula", PLATFORM_FEE_RATE), {});
});

test("a service already booked through the site is not free that day, and a free date is found", () => {
  const ids = ["buffet", "pa-dj"];
  const free = nextFreeDate(ids, "2026-12-01");
  assert.deepEqual(unavailable(ids, free), []);
  const bookings = [{ event: { date: free }, quote: { lines: [{ id: "buffet" }] } }];
  assert.deepEqual(unavailable(ids, free, bookings), ["buffet"]);
  assert.notEqual(nextFreeDate(ids, free, bookings), free);
});

test("phone numbers and email addresses are taken out of messages", async () => {
  const { hideContacts } = await import("../server/extras.js");
  assert.equal(hideContacts("Call me on 0770 123 456 please"), "Call me on [number removed] please");
  assert.equal(hideContacts("+256 770 123456 or me@example.com"), "[number removed] or [email removed]");
  assert.equal(hideContacts("We are 250 guests at 3 pm"), "We are 250 guests at 3 pm");
});

test("a deposit is 30% of the total and leaves the rest as the balance", async () => {
  const { depositFor } = await import("../server/pricing.js");
  assert.equal(depositFor(16995000), 5098500);
  assert.equal(16995000 - depositFor(16995000), 11896500);
});
