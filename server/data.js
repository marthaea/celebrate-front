// Sample catalogue. Swap this file for a database when real vendors come on board.

export const EVENT_TYPES = ["Kwanjula", "Wedding", "Graduation", "Party"];

export const DISTRICTS = ["Mukono", "Kampala", "Wakiso", "Entebbe", "Jinja", "Masaka", "Mbarara", "Gulu"];

// `visit` is what a customer can book with a vendor of that kind before the day.
export const CATEGORIES = [
  { id: "venues", name: "Venues", title: "Venues", visit: "Site visit" },
  { id: "tents", name: "Tents", title: "Tents and seats", visit: "Décor viewing" },
  { id: "catering", name: "Catering", title: "Catering", visit: "Food tasting" },
  { id: "cakes", name: "Cakes", title: "Cakes and pastries", visit: "Cake and pastry tasting" },
  { id: "drinks", name: "Drinks", title: "Drinks and cocktails", visit: "Cocktail tasting" },
  { id: "attire", name: "Attire", title: "Dresses and attire", visit: "Fitting" },
  { id: "sound", name: "Sound", title: "Media and sound", visit: "Sound demo" },
  { id: "photos", name: "Photos", title: "Photography", visit: "Portfolio meeting" },
  { id: "mcs", name: "MCs", title: "MCs", visit: "Meet your MC" },
  { id: "games", name: "Games", title: "Games", visit: "Equipment viewing" },
];

// Times a vendor can be visited for a tasting, fitting or viewing.
export const VISIT_TIMES = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];

export const PAYMENT_METHODS = [
  { id: "mtn", name: "MTN Mobile Money", hint: "Approve on your phone", needsPhone: true },
  { id: "airtel", name: "Airtel Money", hint: "Approve on your phone", needsPhone: true },
  { id: "bank", name: "Bank transfer", hint: "From any local bank", needsPhone: false },
  { id: "card", name: "Debit or credit card", hint: "Visa or Mastercard", needsPhone: false },
];

// qtyRule decides how many units an event needs:
//   flat          one per event
//   perGuest      one per guest
//   per100Guests  one per 100 guests, rounded up
//   perTent       the number of tents the customer asks for
// labour is charged only when the vendor handles setup; transport is always charged.
const s = (id, category, name, vendor, district, price, unit, qtyRule, extra = {}) => ({
  id, category, name, vendor, district, price, unit, qtyRule,
  verified: true, rating: 4.5, reviews: 12, wasPrice: null, summary: "",
  labour: 0, labourPerQty: 0, transport: 0, instantConfirm: true,
  included: [], review: null, photoCaption: `Photo: ${name.toLowerCase()}`, photos: 4,
  ...extra,
});

export const SERVICES = [
  s("lakeside-hall-gardens", "venues", "Reception hall and gardens, full day", "Lakeside Gardens", "Entebbe", 3000000, "day", "flat", {
    rating: 4.8, reviews: 54, summary: "reception hall",
    included: ["Hall for up to 400 guests and the lakeside gardens", "Changing room and secure parking", "Standby generator and washrooms"],
    review: { text: "The gardens made our photos. Staff were helpful all day.", by: "Bride's family, Entebbe" },
  }),
  s("lakeside-hall", "venues", "Reception hall, full day", "Lakeside Gardens", "Entebbe", 2500000, "day", "flat", {
    rating: 4.8, reviews: 54, wasPrice: 3000000, summary: "reception hall",
    included: ["Hall for up to 400 guests", "Secure parking", "Standby generator and washrooms"],
    review: { text: "Clean, spacious and easy for guests to find.", by: "Graduation host, Entebbe" },
  }),
  s("mukono-gardens", "venues", "Garden grounds, full day", "Mukono Green Gardens", "Mukono", 1200000, "day", "flat", {
    rating: 4.4, reviews: 21, summary: "garden grounds",
    included: ["Open lawn for up to 300 guests", "Parking for 60 cars", "Washrooms"],
  }),

  s("draped-tent-100", "tents", "Draped tent + 100 chairs", "Kampala Tent Hire", "Mukono", 450000, "set", "per100Guests", {
    rating: 4.8, reviews: 32, wasPrice: 500000, summary: "tent + 100 chairs", labourPerQty: 150000, transport: 200000,
    photoCaption: "Photo: draped tent set up at a kwanjula", photos: 6,
    included: ["One 100-seater tent with white and gold drapes", "100 plastic chairs with covers", "Setup and take-down by the vendor"],
    review: { text: "They arrived on time and the tent was ready before 8 am.", by: "Host of a kasiki in Entebbe" },
  }),
  s("plain-tent-50", "tents", "Plain tent, 50 seater", "Mukono Shade Masters", "Mukono", 180000, "tent", "perTent", {
    rating: 4.5, reviews: 18, summary: "50-seater", labourPerQty: 40000, transport: 150000,
    included: ["One 50-seater plain white tent", "50 plastic chairs", "Delivery within Mukono"],
  }),
  s("royal-marquee-200", "tents", "Royal marquee, 200 seater", "Namugongo Tents and Decor", "Mukono", 1200000, "day", "flat", {
    rating: 4.9, reviews: 41, summary: "marquee", labour: 300000, transport: 250000,
    included: ["One 200-seater marquee with lining", "Carpet and stage platform", "200 chairs with covers"],
    review: { text: "The marquee looked like a hotel ballroom.", by: "Wedding couple, Namugongo" },
  }),

  s("buffet", "catering", "Buffet, local and continental", "Mama's Kitchen", "Mukono", 35000, "plate", "perGuest", {
    rating: 4.7, reviews: 63, summary: "buffet", labour: 600000, transport: 150000, instantConfirm: false,
    included: ["Matooke, rice, chicken, beef, groundnut sauce and greens", "Soda and water for every guest", "Serving team, plates and cutlery"],
    review: { text: "Food was hot, plenty, and guests kept asking who cooked.", by: "Kwanjula host, Mukono" },
  }),
  s("luwombo", "catering", "Luwombo feast", "Ssenga's Pot", "Kampala", 48000, "plate", "perGuest", {
    rating: 4.9, reviews: 27, summary: "luwombo", labour: 700000, transport: 180000, instantConfirm: false,
    included: ["Chicken, beef or groundnut luwombo", "Matooke, rice and greens", "Serving team in traditional wear"],
  }),
  s("bites", "catering", "Bites and drinks", "Quick Bites UG", "Wakiso", 15000, "plate", "perGuest", {
    rating: 4.3, reviews: 14, wasPrice: 18000, summary: "bites", labour: 200000, transport: 100000,
    included: ["Samosas, chapati rolls and sausages", "Soda and water", "Two servers"],
  }),

  s("kwanjula-cake", "cakes", "Kwanjula cake set", "Sweet Crumbs", "Kampala", 650000, "set", "flat", {
    rating: 4.8, reviews: 38, summary: "cake set", transport: 60000,
    included: ["One main cake and six gift cakes", "Your choice of flavour", "Delivery and table setup"],
  }),
  s("wedding-cake", "cakes", "Three-tier wedding cake", "Sweet Crumbs", "Kampala", 900000, "cake", "flat", {
    rating: 4.8, reviews: 38, summary: "wedding cake", transport: 60000,
    included: ["Three tiers, fondant finish", "Cake stand and knife", "Delivery and table setup"],
  }),
  s("party-cake", "cakes", "Party cake, 3 kg", "Mukono Bakehouse", "Mukono", 180000, "cake", "flat", {
    rating: 4.4, reviews: 22, wasPrice: 200000, summary: "party cake", transport: 20000,
    included: ["3 kg vanilla or chocolate cake", "Custom message", "Delivery within Mukono"],
  }),

  s("pa-dj", "sound", "PA system + DJ", "Bassline Sounds", "Mukono", 1000000, "day", "flat", {
    rating: 4.6, reviews: 29, summary: "PA + DJ", labour: 150000, transport: 100000, instantConfirm: false,
    included: ["Speakers for up to 500 guests", "DJ for the full day", "Two cordless microphones"],
    review: { text: "Clear sound, even at the back tents.", by: "Wedding host, Mukono" },
  }),
  s("pa-only", "sound", "PA system only", "Clear Voice Audio", "Kampala", 450000, "day", "flat", {
    rating: 4.3, reviews: 11, summary: "PA", labour: 80000, transport: 100000,
    included: ["Speakers for up to 300 guests", "Two cordless microphones", "Sound technician"],
  }),
  s("live-band", "sound", "Live band, 3 hours", "Afrigo Tribute Band", "Kampala", 2500000, "show", "flat", {
    rating: 4.9, reviews: 17, summary: "live band", transport: 200000, instantConfirm: false,
    included: ["Six-piece band", "Three one-hour sets", "Own instruments and stage sound"],
  }),

  s("photo-full-day", "photos", "Photography, full day", "Crane Eye Studio", "Kampala", 750000, "day", "flat", {
    rating: 4.7, reviews: 45, summary: "full day",
    included: ["One photographer for the full day", "300 edited photos within 7 days", "Online gallery to share"],
    review: { text: "We had our photos in five days and they were beautiful.", by: "Graduate, Kampala" },
  }),
  s("photo-video", "photos", "Photo + video package", "Crane Eye Studio", "Kampala", 1800000, "day", "flat", {
    rating: 4.7, reviews: 45, wasPrice: 2000000, summary: "photo + video",
    included: ["Two photographers and one videographer", "Highlights film and full video", "Drone shots where allowed"],
  }),
  s("photo-booth", "photos", "Photo booth, 4 hours", "Snap Corner", "Wakiso", 400000, "booth", "flat", {
    rating: 4.5, reviews: 9, summary: "photo booth", transport: 50000,
    included: ["Backdrop and props", "Instant prints for guests", "One attendant"],
  }),

  s("mc-bilingual", "mcs", "MC, Luganda and English", "MC Kato", "Kampala", 500000, "event", "flat", {
    rating: 4.8, reviews: 51, summary: "bilingual MC",
    included: ["Full-day programme hosting", "Planning call before the event", "Works with your DJ and band"],
  }),
  s("omwogezi", "mcs", "Omwogezi for kwanjula", "Ssalongo Mukasa", "Mukono", 800000, "event", "flat", {
    rating: 4.9, reviews: 33, summary: "spokesman", instantConfirm: false,
    included: ["Spokesman for the groom's or bride's side", "Meeting with the family beforehand", "Traditional dress"],
  }),
  s("mc-kids", "mcs", "Kids' party host", "Aunt Joy", "Wakiso", 250000, "event", "flat", {
    rating: 4.6, reviews: 16, summary: "kids' host",
    included: ["Three hours of games and dancing", "Face painting", "Small prizes"],
  }),

  s("bouncing-castle", "games", "Bouncing castle", "Jump Uganda", "Mukono", 150000, "day", "flat", {
    rating: 4.5, reviews: 24, summary: "bouncing castle", transport: 50000,
    included: ["One castle for up to 10 children", "Blower and attendant", "Setup and take-down"],
  }),
  s("kids-bundle", "games", "Kids' games bundle", "Jump Uganda", "Mukono", 350000, "day", "flat", {
    rating: 4.5, reviews: 24, wasPrice: 400000, summary: "games bundle", transport: 50000,
    included: ["Bouncing castle and trampoline", "Slide and ball pit", "Two attendants"],
  }),
  s("lawn-games", "games", "Lawn games set", "Play Day Hire", "Kampala", 120000, "set", "flat", {
    rating: 4.2, reviews: 7, summary: "lawn games", transport: 40000,
    included: ["Sack race, tug of war and ring toss", "Giant board games", "Score sheets"],
  }),

  s("pastry-table", "cakes", "Pastry and dessert table", "Mukono Bakehouse", "Mukono", 350000, "table", "per100Guests", {
    rating: 4.6, reviews: 19, summary: "dessert table", transport: 40000,
    included: ["Mandazi, cupcakes, doughnuts and fruit tarts", "One table for every 100 guests, dressed and labelled", "Serving plates and napkins"],
  }),

  s("cocktail-bar", "drinks", "Cocktail and mocktail bar", "Shake and Stir UG", "Kampala", 12000, "guest", "perGuest", {
    rating: 4.7, reviews: 23, summary: "cocktail bar", labour: 200000, transport: 120000, instantConfirm: false,
    included: ["Two cocktails or mocktails for every guest", "Bartenders, glassware, ice and garnishes", "A signature drink named for your event"],
    review: { text: "The passion fruit mocktail was gone in an hour. Lovely team.", by: "Wedding host, Kampala" },
  }),
  s("juice-station", "drinks", "Fresh juice station", "Shake and Stir UG", "Kampala", 6000, "guest", "perGuest", {
    rating: 4.5, reviews: 15, summary: "juice station", labour: 100000, transport: 80000,
    included: ["Passion fruit, mango and pineapple juice", "Dispensers, cups and ice", "One attendant"],
  }),

  s("bridal-gown", "attire", "Bridal gown hire with fittings", "Kampala Bridal House", "Kampala", 1200000, "gown", "flat", {
    rating: 4.8, reviews: 41, summary: "bridal gown hire",
    included: ["Your choice from over 80 gowns", "Two fittings and alterations", "Veil and steaming on the day before"],
    review: { text: "Three fittings and it sat perfectly. They were so patient with me.", by: "Bride, Wakiso" },
  }),
  s("gomesi-kanzu", "attire", "Gomesi and kanzu, made to measure", "Nakato Tailors", "Kampala", 450000, "pair", "flat", {
    rating: 4.7, reviews: 28, summary: "gomesi and kanzu", instantConfirm: false,
    included: ["One gomesi with sash and one kanzu", "Fabric from our range, or bring your own", "Measuring and one fitting"],
  }),
  s("suit-hire", "attire", "Groom's suit hire", "Kampala Bridal House", "Kampala", 300000, "suit", "flat", {
    rating: 4.5, reviews: 17, summary: "suit hire",
    included: ["Two-piece suit, shirt and tie", "One fitting and adjustments", "Returned within three days"],
  }),
];

export const OFFER_IDS = ["lakeside-hall", "draped-tent-100", "photo-video", "kids-bundle"];
