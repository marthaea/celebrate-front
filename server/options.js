// Settings a customer chooses for a service, by kind of service: a menu for catering, tiers and
// flavour for a cake, hours for sound, a size for attire, and so on. Each setting can change the
// price. This file is plain JavaScript with no server-only code, so the website imports it too and
// shows exactly the price the server will charge.
//
// Price effects, applied to a service's base price:
//   mult        multiplies the price of each unit (a plate, a set, a day)
//   perUnit     adds this many shillings to each unit
//   flat        adds this many shillings once for the whole booking
// The first choice of every setting is the default and changes nothing, so a service booked
// without settings costs its listed price.

const choice = (id, label, effect = {}) => ({ id, label, ...effect });

export const OPTIONS = {
  venues: [
    { id: "hours", label: "How long", type: "one", choices: [
      choice("full", "Full day, 8 am to 6 pm"),
      choice("half", "Half day, up to 5 hours", { mult: 0.6 }),
      choice("late", "Full day and evening, until 11 pm", { mult: 1.3 }),
    ] },
    { id: "decor", label: "Decoration", type: "one", choices: [
      choice("none", "No decoration, I will bring my own"),
      choice("basic", "Basic: table cloths, flowers and draping", { flat: 500000 }),
      choice("full", "Full: theme colours, lighting and an entrance arch", { flat: 1500000 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("generator", "Standby generator with fuel", { flat: 250000 }),
      choice("security", "Two security guards", { flat: 150000 }),
      choice("parking", "Parking attendants", { flat: 100000 }),
    ] },
  ],
  tents: [
    { id: "colours", label: "Draping colours", type: "one", choices: [
      choice("white-gold", "White and gold"),
      choice("maroon-gold", "Maroon and gold"),
      choice("custom", "My event colours", { flat: 150000 }),
    ] },
    { id: "chairs", label: "Chairs", type: "one", choices: [
      choice("covered", "Plastic chairs with covers"),
      choice("sashes", "Covers with sashes in my colours", { perUnit: 60000 }),
      choice("chiavari", "Gold chiavari chairs", { perUnit: 250000 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("lights", "Fairy lights inside each tent", { perUnit: 80000 }),
      choice("carpet", "Carpet flooring", { perUnit: 120000 }),
      choice("tables", "Round tables with cloths", { perUnit: 150000 }),
    ] },
  ],
  catering: [
    { id: "menu", label: "Menu", type: "one", choices: [
      choice("listed", "As listed"),
      choice("local", "Local dishes only"),
      choice("regional", "Dishes from your home region (say which below)"),
      choice("continental", "Local and continental, more choice", { perUnit: 6000 }),
    ] },
    { id: "service", label: "How food is served", type: "one", choices: [
      choice("buffet", "Buffet"),
      choice("served", "Served at the table", { perUnit: 5000 }),
      choice("packed", "Packed take-away boxes", { perUnit: 2000 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("soup", "Soup starter", { perUnit: 3000 }),
      choice("dessert", "Dessert and fruit", { perUnit: 4000 }),
      choice("drinks", "Extra soda and water", { perUnit: 2500 }),
    ] },
    { id: "diet", label: "Dishes you want, and dietary needs", type: "text", placeholder: "e.g. malakwang and eshabwe; 20 vegetarian plates; no pork" },
  ],
  cakes: [
    { id: "size", label: "Size", type: "one", choices: [
      choice("listed", "As listed"),
      choice("bigger", "One size up, an extra tier", { mult: 1.4 }),
      choice("biggest", "Two sizes up, two extra tiers", { mult: 1.8 }),
    ] },
    { id: "flavour", label: "Flavour", type: "one", choices: [
      choice("vanilla", "Vanilla"),
      choice("chocolate", "Chocolate"),
      choice("red-velvet", "Red velvet", { mult: 1.1 }),
      choice("fruit", "Fruit cake", { mult: 1.15 }),
    ] },
    { id: "finish", label: "Icing", type: "one", choices: [
      choice("butter", "Buttercream"),
      choice("fondant", "Fondant", { mult: 1.15 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("topper", "Custom topper with names", { flat: 50000 }),
      choice("cupcakes", "50 matching cupcakes", { flat: 150000 }),
    ] },
    { id: "message", label: "Message on the cake", type: "text", placeholder: "e.g. Congratulations Sarah and David" },
  ],
  drinks: [
    { id: "menu", label: "Drinks", type: "one", choices: [
      choice("mocktails", "Mocktails only, no alcohol"),
      choice("both", "Cocktails and mocktails", { mult: 1.4 }),
    ] },
    { id: "amount", label: "How much per guest", type: "one", choices: [
      choice("two", "Two drinks each"),
      choice("three", "Three drinks each", { mult: 1.5 }),
      choice("open", "Open bar for three hours", { mult: 2.2 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("bar", "Decorated bar counter", { flat: 200000 }),
      choice("signature", "A signature drink named for you", { flat: 80000 }),
    ] },
  ],
  attire: [
    { id: "size", label: "Size", type: "one", choices: [
      choice("measure", "Take my measurements at the fitting"),
      choice("s", "Small"),
      choice("m", "Medium"),
      choice("l", "Large"),
      choice("xl", "Extra large"),
    ] },
    { id: "colour", label: "Colour or fabric", type: "text", placeholder: "e.g. ivory, or gold and maroon kitenge" },
    { id: "fittings", label: "Fittings", type: "one", choices: [
      choice("included", "As included"),
      choice("extra", "One extra fitting", { flat: 50000 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("accessories", "Matching accessories", { flat: 100000 }),
      choice("shoes", "Shoes", { flat: 150000 }),
      choice("steam", "Steaming and delivery on the day", { flat: 50000 }),
    ] },
  ],
  sound: [
    { id: "hours", label: "How long", type: "one", choices: [
      choice("full", "As listed"),
      choice("short", "Four hours", { mult: 0.7 }),
      choice("late", "Into the night, until midnight", { mult: 1.3 }),
    ] },
    { id: "music", label: "Music style", type: "one", choices: [
      choice("mixed", "A bit of everything"),
      choice("ugandan", "Mostly Ugandan"),
      choice("gospel", "Gospel"),
      choice("oldies", "Oldies and rhumba"),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("mics", "Two more wireless microphones", { flat: 50000 }),
      choice("lights", "Stage lighting", { flat: 300000 }),
      choice("screen", "Big screen", { flat: 800000 }),
    ] },
  ],
  photos: [
    { id: "coverage", label: "Coverage", type: "one", choices: [
      choice("listed", "As listed"),
      choice("short", "Four hours", { mult: 0.6 }),
      choice("two-days", "Two days, the eve and the day", { mult: 1.8 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("album", "Printed album, 40 pages", { flat: 350000 }),
      choice("drone", "Drone shots", { flat: 400000 }),
      choice("same-day", "Same-day highlights to share", { flat: 250000 }),
    ] },
  ],
  mcs: [
    // English and Swahili are Uganda's official languages; the rest are in alphabetical order.
    { id: "languages", label: "Languages for the day", type: "many", choices: [
      choice("english", "English"), choice("swahili", "Swahili"),
      choice("acholi", "Acholi"), choice("alur", "Alur"), choice("ateso", "Ateso"), choice("kakwa", "Kakwa"),
      choice("karimojong", "Karimojong"), choice("kupsabiny", "Kupsabiny"), choice("lango", "Lango"), choice("luganda", "Luganda"),
      choice("lugbara", "Lugbara"), choice("lugwere", "Lugwere"), choice("lukonzo", "Lukonzo"), choice("lumasaba", "Lumasaba (Lugisu)"),
      choice("lusamia", "Lusamia"), choice("lusoga", "Lusoga"), choice("madi", "Madi"), choice("runyankore", "Runyankore-Rukiga"),
      choice("runyoro", "Runyoro-Rutooro"), choice("rufumbira", "Rufumbira"),
    ] },
    { id: "otherLanguage", label: "Another language", type: "text", placeholder: "Any language not listed" },
    { id: "length", label: "How long", type: "one", choices: [
      choice("event", "Up to five hours"),
      choice("full", "The full day", { mult: 1.4 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("rehearsal", "A rehearsal with the family", { flat: 100000 }),
      choice("programme", "Written programme for the day", { flat: 50000 }),
    ] },
  ],
  games: [
    { id: "hours", label: "How long", type: "one", choices: [
      choice("full", "As listed"),
      choice("short", "Four hours", { mult: 0.7 }),
    ] },
    { id: "attendants", label: "Attendants", type: "one", choices: [
      choice("one", "One attendant"),
      choice("two", "Two attendants", { flat: 80000 }),
    ] },
    { id: "extras", label: "Also include", type: "many", choices: [
      choice("face-paint", "Face painting", { flat: 100000 }),
      choice("trampoline", "Trampoline", { flat: 150000 }),
      choice("prizes", "Small prizes for the children", { flat: 60000 }),
    ] },
  ],
};

export const optionsFor = (category) => OPTIONS[category] ?? [];

/** Phone numbers and email addresses typed into a setting are taken out, as in messages. */
const clean = (text) =>
  String(text ?? "")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number removed]")
    .trim()
    .slice(0, 160);

/**
 * A customer's settings for a service, checked against what that kind of service offers.
 * Anything unknown is dropped and missing settings take their default. Always returns a full set.
 */
export function normaliseChoices(category, raw = {}) {
  const result = {};
  for (const option of optionsFor(category)) {
    const given = raw?.[option.id];
    if (option.type === "one") {
      result[option.id] = option.choices.some((c) => c.id === given) ? given : option.choices[0].id;
    } else if (option.type === "many") {
      const list = Array.isArray(given) ? given : [];
      result[option.id] = option.choices.filter((c) => list.includes(c.id)).map((c) => c.id);
    } else if (option.type === "text") {
      result[option.id] = clean(given);
    }
  }
  return result;
}

/** The chosen settings as price effects: [{ label, mult, perUnit, flat }]. */
function effectsOf(category, choices) {
  const picked = [];
  for (const option of optionsFor(category)) {
    if (option.type === "one") picked.push(option.choices.find((c) => c.id === choices[option.id]));
    if (option.type === "many") picked.push(...option.choices.filter((c) => choices[option.id]?.includes(c.id)));
  }
  return picked.filter(Boolean);
}

/**
 * How settings change a service's price: the price of one unit, and an amount added once.
 * Labour and transport are not affected.
 */
export function pricedWith(service, choices) {
  let unit = service.price;
  let flat = 0;
  for (const effect of effectsOf(service.category, choices)) {
    if (effect.mult) unit *= effect.mult;
    if (effect.perUnit) unit += effect.perUnit;
    if (effect.flat) flat += effect.flat;
  }
  return { unit: Math.round(unit / 100) * 100, flat };
}

/** A short description of the settings that differ from the defaults, for receipts and vendors. */
export function describeChoices(category, choices) {
  const parts = [];
  for (const option of optionsFor(category)) {
    const value = choices?.[option.id];
    if (option.type === "one" && value && value !== option.choices[0].id) {
      parts.push(option.choices.find((c) => c.id === value)?.label);
    } else if (option.type === "many" && value?.length) {
      parts.push(...option.choices.filter((c) => value.includes(c.id)).map((c) => c.label));
    } else if (option.type === "text" && value) {
      parts.push(`${option.label}: ${value}`);
    }
  }
  return parts.filter(Boolean).join(" · ");
}
