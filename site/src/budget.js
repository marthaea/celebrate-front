// The budget planner: given what each option costs for this event, choose a set that fits a budget.
// Pure functions, so they can be tested without a browser (tests/budget.js).

// Which categories matter most for each kind of event; earlier ones are filled and upgraded first.
export const PRIORITY = {
  Introduction: ["tents", "catering", "sound", "mcs", "attire", "photos", "cakes", "drinks", "venues", "games"],
  Giveaway: ["tents", "catering", "sound", "mcs", "attire", "photos", "cakes", "drinks", "venues", "games"],
  "Cultural ceremony": ["tents", "catering", "sound", "mcs", "attire", "drinks", "photos", "venues", "cakes", "games"],
  Wedding: ["venues", "catering", "attire", "tents", "sound", "photos", "cakes", "drinks", "mcs", "games"],
  Graduation: ["catering", "tents", "sound", "photos", "cakes", "drinks", "mcs", "venues", "attire", "games"],
  Party: ["catering", "drinks", "sound", "cakes", "games", "tents", "photos", "mcs", "venues", "attire"],
};

/** Grand total for a set of chosen options: their costs plus the platform fee. */
export function totalOf(picks, feeRate) {
  const sum = Object.values(picks).reduce((all, option) => all + option.cost, 0);
  return sum + Math.round(sum * feeRate);
}

/**
 * Picks one option per category, as many categories as the budget allows.
 * First the cheapest option in each category, in priority order; then, while money is left,
 * steps each category up to its next better option, one step per category per round.
 * `categories` is [{ id, options: [{ id, cost, ... }] sorted by cost }]. Returns { categoryId: option }.
 */
export function suggest(categories, budget, type, feeRate) {
  const order = (PRIORITY[type] ?? PRIORITY.Introduction)
    .map((id) => categories.find((category) => category.id === id))
    .filter((category) => category?.options.length);
  const picks = {};
  const fits = (id, option) => totalOf({ ...picks, [id]: option }, feeRate) <= budget;

  for (const category of order) {
    if (fits(category.id, category.options[0])) picks[category.id] = category.options[0];
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of order) {
      const current = picks[category.id];
      if (!current) continue;
      const better = category.options[category.options.indexOf(current) + 1];
      if (better && fits(category.id, better)) {
        picks[category.id] = better;
        changed = true;
      }
    }
  }
  return picks;
}

/** The least this event can cost with the single most important category filled. */
export function smallestBudget(categories, type, feeRate) {
  const first = (PRIORITY[type] ?? PRIORITY.Introduction).map((id) => categories.find((c) => c.id === id)).find((c) => c?.options.length);
  return first ? totalOf({ [first.id]: first.options[0] }, feeRate) : 0;
}
