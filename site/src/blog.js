/**
 * Blog posts, shown on /blog and /blog/<slug>. Search engines see each post's title, description
 * and date, and every post is listed in the sitemap.
 *
 * These are sample posts written to show the layout; edit them or replace them with your own.
 * To add a post, copy one entry and change it:
 * - `slug`: the address, /blog/<slug> (lowercase words joined by hyphens, never reused)
 * - `date`: YYYY-MM-DD; newest posts are shown first
 * - `photo`: a key from site/src/photos.js, or a path such as "/blog/my-photo.jpg" for a file in site/public/blog/
 * - `body`: paragraphs as plain strings, `{ h: "Heading" }` for a heading, `{ list: ["…", "…"] }` for a list
 */
export const POSTS = [
  {
    slug: "plan-an-event-budget",
    title: "How to plan an event budget that holds",
    description: "Start from the number you can afford, put the essentials first, and keep a little back for the surprises every celebration brings.",
    date: "2026-11-12",
    author: "Celebrate team",
    tag: "Budgeting",
    photo: "feature",
    body: [
      "Most celebrations go over budget for the same reason: the plan starts with wishes instead of a number. Start with the amount the family can truly spend, then let that number decide the rest.",
      { h: "1. Agree the total first" },
      "Sit down with whoever is contributing and agree one figure. If friends and relatives will pledge, count only what has been promised, not what you hope for. You can share your plan from Celebrate so contributors see exactly what their money covers.",
      { h: "2. Put the essentials first" },
      "Guests remember whether they had a seat, food and could hear the speeches. Cover the venue or tents, catering, and sound before anything decorative. The budget planner does this for you: it fills the most important categories for your type of event first.",
      { h: "3. Count guests honestly" },
      "Food, seats and drinks are all priced per guest or per hundred guests, so the guest count drives most of the total. A list that grows from 200 to 300 can add a third to the bill.",
      { h: "4. Keep some back" },
      { list: ["Transport for vendors coming from another town", "Extra plates for guests who were not on the list", "Small tips and last-minute purchases"] },
      "Ten per cent of the total is a sensible cushion. If you do not need it, it becomes a gift for the couple or the graduate.",
    ],
  },
  {
    slug: "introduction-ceremony-checklist",
    title: "An introduction ceremony checklist, from first meeting to the day",
    description: "Whatever your community calls it, the traditional introduction has many moving parts. Here is a simple timeline to keep the family on track.",
    date: "2026-10-28",
    author: "Celebrate team",
    tag: "Planning",
    photo: "hero-left",
    body: [
      "Every region and family does the introduction its own way, with its own names, gifts and order of events. The planning, though, looks much the same everywhere. Use this list as a starting point and adjust it to your customs.",
      { h: "Three to six months before" },
      { list: ["Agree the date with both families", "Set the budget and the guest numbers for each side", "Book the venue or the home compound, and the tents if you are outdoors"] },
      { h: "Two months before" },
      { list: ["Book the caterer and taste the menu", "Book an MC who speaks the languages both families use", "Order outfits early: tailors are busiest in the holiday season"] },
      { h: "One month before" },
      { list: ["Confirm sound, photography and any dancers or band", "Order the cake and the gifts", "Share the plan with relatives contributing money"] },
      { h: "The week of the event" },
      { list: ["Confirm arrival times with every vendor", "Pay balances that are due before the day", "Keep your receipts and booking numbers on your phone"] },
      "On Celebrate, vendors confirm within 24 hours, and you can see every booking, payment and appointment in one place.",
    ],
  },
  {
    slug: "how-many-tents-and-chairs",
    title: "How many tents, chairs and plates do you need?",
    description: "A quick guide to sizing tents, seats and catering for the number of guests you expect, so nobody is left standing.",
    date: "2026-10-09",
    author: "Celebrate team",
    tag: "Guides",
    photo: "royal-marquee-200",
    body: [
      "Sizing an outdoor event is simple arithmetic once you know how vendors count.",
      { h: "Tents and seats" },
      "Tents are usually sold by the number of seats they cover, for example 50 or 100 seaters. Divide your guest count by the size of the tent and round up. Leave room for a high table, the MC and the sound system, which often need a tent of their own.",
      { h: "Food" },
      "Caterers charge per plate. Plan for every guest plus five to ten per cent for vendors, helpers and unexpected guests. If children are coming, ask whether there is a child's price.",
      { h: "Drinks" },
      "Drinks are priced per guest. For a long day, assume more than one drink each, and make sure there is water for everyone.",
      { h: "Let the plan do the counting" },
      "When you enter your guest numbers on Celebrate, each quote updates automatically: tents, plates and drinks are recalculated for your crowd, and you see the grand total straight away.",
    ],
  },
  {
    slug: "choosing-vendors-you-can-trust",
    title: "Choosing vendors you can trust",
    description: "Reviews, clear prices and written terms: what to look for before you pay a deposit.",
    date: "2026-09-22",
    author: "Celebrate team",
    tag: "Guides",
    photo: "photo-full-day",
    body: [
      "A deposit is a promise from both sides. Before you make one, check a few things.",
      { list: [
        "Reviews from real bookings, not only from friends",
        "A price that says what is included: labour, transport, setup and take-down",
        "Clear rules on what happens if either side cancels",
        "A way to reach the vendor that is recorded, so there is no confusion later",
      ] },
      "Every vendor on Celebrate is checked before they appear, prices show what is included, and your deposit is held until the vendor accepts. If something goes wrong, there is a complaints process with set response times.",
    ],
  },
];

export const postBySlug = (slug) => POSTS.find((post) => post.slug === slug);
export const sortedPosts = () => [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
