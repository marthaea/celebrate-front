// Sample catalogue. Swap this file for a database when real vendors come on board.

// Neutral names, so no one community's word stands for everyone's ceremony. Each community's own
// name (kwanjula, nyom and others) is welcome in the host's notes and in vendors' listings.
export const EVENT_TYPES = [
  "Introduction", "Wedding", "Giveaway", "Graduation", "Cultural ceremony", "Party",
  "Bridal shower", "Baby shower", "Birthday", "Christening", "Proposal", "Corporate event",
];
export const EVENT_NOTES = {
  Introduction: "The traditional introduction or bride-price ceremony, whatever your community calls it.",
  Giveaway: "Sending off the bride from her family's home.",
  "Cultural ceremony": "A clan, coming-of-age or other traditional celebration.",
  "Bridal shower": "A smaller celebration for the bride, with her closest friends and family.",
  "Baby shower": "Welcoming a new baby before they arrive, with family and close friends.",
  Christening: "A baby's naming or dedication, often followed by a family lunch.",
  Proposal: "Planning the moment itself, from the setting to who is in on the surprise.",
  "Corporate event": "A launch, conference, team day or office party, planned the same way.",
};
// Older plans and bookings used the Luganda word for the introduction.
export const EVENT_ALIASES = { Kwanjula: "Introduction" };

export const DISTRICTS = [
  // Central
  "Kampala", "Wakiso", "Mukono", "Entebbe", "Masaka", "Mityana", "Luweero", "Mpigi",
  // Eastern
  "Jinja", "Mbale", "Soroti", "Tororo", "Iganga", "Busia", "Kapchorwa",
  // Northern, West Nile and Karamoja
  "Gulu", "Lira", "Kitgum", "Arua", "Nebbi", "Moroto",
  // Western
  "Mbarara", "Fort Portal", "Hoima", "Kasese", "Kabale", "Masindi", "Ntungamo",
];

/** An area is a listed district, or another place typed in when "Other" is chosen. */
export const cleanPlace = (text) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
export const isPlace = (text) => DISTRICTS.includes(text) || /^[A-Za-z][A-Za-z .'-]{1,39}$/.test(String(text ?? ""));

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

  // Vendors across the regions: northern, West Nile, eastern and western Uganda.
  s("nile-bank-gardens", "venues", "Riverside garden venue, full day", "Nile Bank Gardens", "Jinja", 1500000, "day", "flat", {
    rating: 4.7, reviews: 26, summary: "garden venue", included: ["Lawn for up to 400 guests by the Nile", "Parking and washrooms", "Standby generator"],
  }),
  s("bunyonyi-gardens", "venues", "Lakeside garden venue, full day", "Bunyonyi View Gardens", "Kabale", 1300000, "day", "flat", {
    rating: 4.8, reviews: 19, summary: "lakeside venue", included: ["Terraced lawn for up to 300 guests", "Parking", "Changing room"],
  }),
  s("lira-tents-100", "tents", "Tent and 100 chairs", "Lira Tent Hire", "Lira", 380000, "set", "per100Guests", {
    rating: 4.6, reviews: 21, summary: "tent + 100 chairs", labourPerQty: 100000, transport: 120000,
    included: ["One 100-seater tent", "100 chairs with covers", "Setup and take-down"],
  }),
  s("fortportal-marquee", "tents", "Marquee, 300 seater", "Tooro Marquees", "Fort Portal", 1400000, "day", "flat", {
    rating: 4.7, reviews: 15, summary: "marquee", labour: 250000, transport: 200000,
    included: ["One 300-seater lined marquee", "300 chairs with covers", "Stage platform"],
  }),
  s("northern-menu", "catering", "Northern menu: malakwang, boo and kwon kal", "Gulu Home Kitchen", "Gulu", 28000, "plate", "perGuest", {
    rating: 4.8, reviews: 33, summary: "northern menu", labour: 350000, transport: 120000, instantConfirm: false,
    included: ["Malakwang, boo and groundnut paste", "Kwon kal, rice and chicken or beef", "Serving team, plates and cutlery"],
    review: { text: "Our elders said it tasted like home. Plenty for everyone.", by: "Wedding host, Gulu" },
  }),
  s("ankole-feast", "catering", "Ankole feast with eshabwe", "Mbarara Kitchen and Grill", "Mbarara", 32000, "plate", "perGuest", {
    rating: 4.7, reviews: 29, summary: "Ankole feast", labour: 400000, transport: 150000, instantConfirm: false,
    included: ["Eshabwe, beef and chicken", "Matooke, millet bread and greens", "Serving team and drinks"],
  }),
  s("eastern-menu", "catering", "Eastern menu with malewa", "Elgon Caterers", "Mbale", 27000, "plate", "perGuest", {
    rating: 4.6, reviews: 18, summary: "eastern menu", labour: 300000, transport: 120000,
    included: ["Malewa, chicken and beef stew", "Millet bread, rice and greens", "Soda and water"],
  }),
  s("gulu-cake-set", "cakes", "Celebration cake set", "Gulu Bakers", "Gulu", 450000, "set", "flat", {
    rating: 4.5, reviews: 12, summary: "cake set", transport: 40000,
    included: ["One main cake and four gift cakes", "Your choice of flavour", "Delivery within Gulu"],
  }),
  s("soroti-sound", "sound", "PA system + DJ", "Teso Sound Masters", "Soroti", 700000, "day", "flat", {
    rating: 4.6, reviews: 17, summary: "PA + DJ", labour: 100000, transport: 100000,
    included: ["Speakers for up to 400 guests", "DJ for the full day", "Two wireless microphones"],
  }),
  s("dance-troupe", "sound", "Traditional dance troupe", "Heritage Dancers Uganda", "Kampala", 900000, "show", "flat", {
    rating: 4.9, reviews: 24, summary: "dance troupe", transport: 250000,
    included: ["Twelve dancers and drummers", "Dances from whichever region you choose", "Travels countrywide"],
  }),
  s("mbale-photos", "photos", "Photography, full day", "Elgon Lens Studio", "Mbale", 600000, "day", "flat", {
    rating: 4.6, reviews: 14, summary: "full day",
    included: ["Two photographers", "300 edited photos", "Online gallery"],
  }),
  s("mc-acholi", "mcs", "MC, Acholi and English", "Gulu Voices MC", "Gulu", 400000, "event", "flat", {
    rating: 4.8, reviews: 20, summary: "MC",
    included: ["Runs the programme in Acholi and English", "Knows the customs of the day", "Meets the family beforehand"],
  }),
  s("mc-runyankore", "mcs", "MC, Runyankore-Rukiga and English", "Ankole Ceremonies MC", "Mbarara", 450000, "event", "flat", {
    rating: 4.7, reviews: 16, summary: "MC",
    included: ["Runs the programme in Runyankore-Rukiga and English", "Leads the giveaway customs", "Meets the family beforehand"],
  }),
  s("mc-ateso", "mcs", "MC, Ateso and English", "Teso Events MC", "Soroti", 350000, "event", "flat", {
    rating: 4.6, reviews: 11, summary: "MC",
    included: ["Runs the programme in Ateso and English", "Meets the family beforehand"],
  }),
  s("mc-lugbara", "mcs", "MC, Lugbara and English", "West Nile Events", "Arua", 380000, "event", "flat", {
    rating: 4.7, reviews: 13, summary: "MC",
    included: ["Runs the programme in Lugbara and English", "Meets the family beforehand"],
  }),
  s("mushanana", "attire", "Mushanana, made to measure", "Mbarara Tailors", "Mbarara", 400000, "outfit", "flat", {
    rating: 4.7, reviews: 15, summary: "mushanana", instantConfirm: false,
    included: ["One mushanana with sash, in your colours", "Measuring and one fitting"],
  }),
  s("arua-tents", "tents", "Tents and chairs, 50 seater", "Arua Tent Services", "Arua", 160000, "tent", "perTent", {
    rating: 4.5, reviews: 10, summary: "50-seater", labourPerQty: 35000, transport: 100000,
    included: ["One 50-seater tent", "50 chairs", "Delivery within Arua"],
  }),

  // Placeholder businesses, so hosts can compare budget, mid-range and premium options in each kind
  // of service and in every region. Names and prices are made up for the demonstration.

  // Attire: from simple hire to made-to-order
  s("nalongo-gown-classic", "attire", "Bridal gown hire, classic styles", "Nalongo Bridal Wear", "Kampala", 650000, "gown", "flat", {
    rating: 4.6, reviews: 38, wasPrice: 750000, summary: "gown hire",
    included: ["Choose from 40 classic gowns", "One fitting and small alterations", "Veil included"],
  }),
  s("nalongo-gown-designer", "attire", "Designer bridal gown, made to order", "Nalongo Bridal Wear", "Kampala", 3500000, "gown", "flat", {
    rating: 4.9, reviews: 22, summary: "designer gown", instantConfirm: false,
    included: ["Designed with you from sketch to finish", "Three fittings", "The gown is yours to keep"],
  }),
  s("glam-gents-hire", "attire", "Three-piece suit hire", "Glam Gents Suits", "Kampala", 250000, "suit", "flat", {
    rating: 4.5, reviews: 41, summary: "suit hire",
    included: ["Jacket, waistcoat and trousers", "Shirt and tie or bow tie", "One fitting"],
  }),
  s("glam-gents-tailored", "attire", "Tailored three-piece suit, to keep", "Glam Gents Suits", "Kampala", 1200000, "suit", "flat", {
    rating: 4.8, reviews: 19, summary: "tailored suit", instantConfirm: false,
    included: ["Cut to your measurements", "Two fittings", "Fabric of your choice from our range"],
  }),
  s("kirungi-kanzu", "attire", "Kanzu and jacket, made to measure", "Kirungi and Sons Tailors", "Masaka", 180000, "outfit", "flat", {
    rating: 4.7, reviews: 27, summary: "kanzu and jacket",
    included: ["Kanzu in white or cream", "Matching jacket", "Measuring and one fitting"],
  }),
  s("kirungi-family-outfits", "attire", "Matching outfits for the family party, per outfit", "Kirungi and Sons Tailors", "Masaka", 95000, "outfit", "flat", {
    rating: 4.6, reviews: 15, summary: "family outfit",
    included: ["Kitenge or plain fabric in your colours", "Measuring", "Ready in ten days"],
  }),
  s("amani-gown-simple", "attire", "Bridal gown hire, simple", "Amani Bridal Corner", "Gulu", 250000, "gown", "flat", {
    rating: 4.4, reviews: 12, summary: "gown hire",
    included: ["Choose from 15 gowns", "Veil", "Steaming before the day"],
  }),
  s("elgon-bridesmaids", "attire", "Bridesmaid dresses, per dress", "Elgon Fashion House", "Mbale", 120000, "dress", "flat", {
    rating: 4.5, reviews: 18, summary: "bridesmaid dress",
    included: ["Your colour and style", "Measuring and one fitting"],
  }),
  s("tooro-couple-traditional", "attire", "Traditional outfits for the couple, hire", "Tooro Traditional Wear", "Fort Portal", 300000, "pair", "flat", {
    rating: 4.6, reviews: 13, summary: "traditional outfits",
    included: ["Outfits for the bride and groom", "Sashes and accessories", "One fitting"],
  }),

  // Cakes and pastries
  s("sweet-moments-party", "cakes", "Party cake, 2 kg", "Sweet Moments Bakery", "Jinja", 90000, "cake", "flat", {
    rating: 4.3, reviews: 24, summary: "party cake", transport: 15000,
    included: ["2 kg cake, two flavours to choose from", "Message on top", "Delivery within Jinja"],
  }),
  s("creme-five-tier", "cakes", "Five-tier showpiece wedding cake", "Crème Cakes Studio", "Kampala", 2500000, "cake", "flat", {
    rating: 4.9, reviews: 16, summary: "five-tier cake", transport: 80000, instantConfirm: false,
    included: ["Five tiers with sugar flowers", "Tasting session for two", "Delivery, setup and cake stand"],
  }),
  s("arua-oven-set", "cakes", "Cake set for the ceremony", "Arua Oven", "Arua", 300000, "set", "flat", {
    rating: 4.5, reviews: 10, summary: "cake set", transport: 30000,
    included: ["One main cake and three gift cakes", "Delivery within Arua"],
  }),
  s("kabale-cupcakes", "cakes", "Cupcake table", "Kabale Bakehouse", "Kabale", 200000, "table", "per100Guests", {
    rating: 4.6, reviews: 11, summary: "cupcake table", transport: 30000,
    included: ["100 cupcakes per table, three flavours", "Stand and labels"],
  }),

  // Drinks
  s("juice-point-gulu", "drinks", "Fresh juice", "Juice Point", "Gulu", 3500, "guest", "perGuest", {
    rating: 4.4, reviews: 14, summary: "fresh juice", transport: 40000,
    included: ["Passion fruit or mango juice", "Cups and ice"],
  }),
  s("ankole-milk-bar", "drinks", "Fresh milk and yoghurt bar", "Rwizi Dairy Drinks", "Mbarara", 4000, "guest", "perGuest", {
    rating: 4.7, reviews: 17, summary: "milk bar", labour: 60000, transport: 50000,
    included: ["Fresh milk and yoghurt", "Gourds or cups", "One attendant"],
  }),
  s("lira-sodas", "drinks", "Sodas and water supply", "Lira Beverages", "Lira", 2000, "guest", "perGuest", {
    rating: 4.2, reviews: 9, summary: "sodas and water", transport: 30000,
    included: ["Two sodas and one water per guest", "Delivered cold"],
  }),
  s("silver-spoon-bar", "drinks", "Premium cocktail bar", "Silver Spoon Bars", "Kampala", 25000, "guest", "perGuest", {
    rating: 4.9, reviews: 21, summary: "premium bar", labour: 400000, transport: 150000, instantConfirm: false,
    included: ["Three cocktails per guest, premium spirits", "Mocktails for those who do not drink", "Four bartenders and a styled bar"],
  }),
  s("elgon-mobile-bar", "drinks", "Mobile bar with bartenders", "Elgon Mobile Bar", "Mbale", 9000, "guest", "perGuest", {
    rating: 4.5, reviews: 12, summary: "mobile bar", labour: 150000, transport: 80000,
    included: ["Two drinks per guest", "Two bartenders", "Bar counter"],
  }),

  // Catering
  s("community-cooks", "catering", "Home-style food for big crowds", "Kasenge Community Cooks", "Mukono", 12000, "plate", "perGuest", {
    rating: 4.3, reviews: 31, summary: "home-style food", labour: 150000, transport: 60000,
    included: ["Matooke, rice, beans and beef", "Served from the pots", "Plates and cutlery"],
  }),
  s("royal-feast", "catering", "Plated fine dining, three courses", "Royal Feast Caterers", "Kampala", 75000, "plate", "perGuest", {
    rating: 4.9, reviews: 25, summary: "fine dining", labour: 900000, transport: 200000, instantConfirm: false,
    included: ["Starter, main and dessert, served at the table", "Waiters in uniform", "Linen, glassware and cutlery"],
  }),
  s("soroti-kitchen", "catering", "Buffet with local dishes", "Teso Kitchen", "Soroti", 20000, "plate", "perGuest", {
    rating: 4.5, reviews: 14, summary: "buffet", labour: 200000, transport: 80000,
    included: ["Millet bread, rice, groundnut sauce and chicken", "Serving team", "Plates and cutlery"],
  }),
  s("arua-delights", "catering", "Buffet for ceremonies", "Arua Delights", "Arua", 22000, "plate", "perGuest", {
    rating: 4.4, reviews: 11, summary: "buffet", labour: 200000, transport: 80000,
    included: ["Cassava, rice, beans, chicken and fish", "Serving team", "Plates and cutlery"],
  }),

  // Venues
  s("lira-town-hall", "venues", "Community hall, full day", "Lira Town Hall Hire", "Lira", 500000, "day", "flat", {
    rating: 4.2, reviews: 9, summary: "community hall", included: ["Hall for up to 300 guests", "Chairs and tables", "Washrooms"],
  }),
  s("kololo-ballroom", "venues", "Hotel ballroom, full day", "Kololo Heights Ballroom", "Kampala", 6500000, "day", "flat", {
    rating: 4.9, reviews: 34, summary: "ballroom", instantConfirm: false,
    included: ["Air-conditioned ballroom for 600 guests", "Bridal suite for the night", "Valet parking and security"],
  }),
  s("gulu-garden-grounds", "venues", "Garden grounds, full day", "Gulu Garden Grounds", "Gulu", 800000, "day", "flat", {
    rating: 4.5, reviews: 15, summary: "garden grounds", included: ["Lawn for up to 500 guests", "Parking", "Washrooms"],
  }),
  s("rwizi-gardens", "venues", "Riverside gardens, full day", "Rwizi Riverside Gardens", "Mbarara", 1000000, "day", "flat", {
    rating: 4.7, reviews: 20, summary: "riverside gardens", included: ["Lawn for up to 400 guests", "Standby generator", "Parking"],
  }),

  // Tents and seats
  s("masaka-budget-tents", "tents", "Plain tent, 50 seater", "Masaka Budget Tents", "Masaka", 120000, "tent", "perTent", {
    rating: 4.2, reviews: 16, summary: "50-seater", labourPerQty: 30000, transport: 80000,
    included: ["One 50-seater tent", "50 plastic chairs"],
  }),
  s("elite-stretch-tent", "tents", "Stretch tent with chandeliers, 250 seater", "Elite Canopies", "Kampala", 2500000, "day", "flat", {
    rating: 4.9, reviews: 18, summary: "stretch tent", labour: 400000, transport: 300000, instantConfirm: false,
    included: ["Stretch tent for 250 guests", "Chandeliers and draping", "Gold chiavari chairs"],
  }),
  s("mbale-party-hire", "tents", "Tent and 100 chairs", "Mbale Party Hire", "Mbale", 400000, "set", "per100Guests", {
    rating: 4.5, reviews: 13, summary: "tent + 100 chairs", labourPerQty: 90000, transport: 100000,
    included: ["One 100-seater tent", "100 chairs with covers", "Setup and take-down"],
  }),

  // Media and sound
  s("gulu-beats", "sound", "PA system, half day", "Gulu Beats", "Gulu", 350000, "day", "flat", {
    rating: 4.3, reviews: 12, summary: "PA", transport: 60000,
    included: ["Speakers for up to 300 guests", "Two microphones", "An operator"],
  }),
  s("soundwave-pro", "sound", "Concert sound, lights and DJ", "SoundWave Pro", "Kampala", 3000000, "day", "flat", {
    rating: 4.9, reviews: 23, summary: "concert sound", labour: 300000, transport: 200000, instantConfirm: false,
    included: ["Line-array sound for 1,000 guests", "Stage lighting", "Two DJs and a sound engineer"],
  }),
  s("ankole-brass-band", "sound", "Brass band, 2 hours", "Ankole Brass Band", "Mbarara", 800000, "show", "flat", {
    rating: 4.7, reviews: 14, summary: "brass band", transport: 150000,
    included: ["Fourteen musicians", "Processional and reception music"],
  }),

  // Photography
  s("snap-and-go", "photos", "Photography, half day", "Snap and Go Studio", "Lira", 250000, "day", "flat", {
    rating: 4.3, reviews: 17, summary: "half day",
    included: ["One photographer for five hours", "150 edited photos"],
  }),
  s("golden-hour-films", "photos", "Cinematic photo and film, two days", "Golden Hour Films", "Kampala", 3500000, "day", "flat", {
    rating: 4.9, reviews: 29, summary: "photo and film", instantConfirm: false,
    included: ["Three photographers and two filmmakers", "Drone and same-day highlights", "Printed album and a 20-minute film"],
  }),
  s("arua-photo-hub", "photos", "Photography, full day", "Arua Photo Hub", "Arua", 450000, "day", "flat", {
    rating: 4.5, reviews: 10, summary: "full day", included: ["Two photographers", "250 edited photos"],
  }),
  s("kabale-captures", "photos", "Photo and video, full day", "Kabale Captures", "Kabale", 900000, "day", "flat", {
    rating: 4.6, reviews: 12, summary: "photo and video", included: ["One photographer and one videographer", "Edited film and 300 photos"],
  }),

  // MCs
  s("mc-lusoga", "mcs", "MC, Lusoga and English", "Busoga Ceremonies MC", "Jinja", 300000, "event", "flat", {
    rating: 4.6, reviews: 15, summary: "MC", included: ["Runs the programme in Lusoga and English", "Meets the family beforehand"],
  }),
  s("mc-headliner", "mcs", "Headline MC, several languages", "Headliner Events MC", "Kampala", 1500000, "event", "flat", {
    rating: 4.9, reviews: 40, summary: "MC", instantConfirm: false,
    included: ["Well-known MC for large events", "English and Swahili, plus one other language of your choice", "Two planning meetings and a rehearsal"],
  }),

  // Games
  s("gulu-bounce", "games", "Bouncing castle", "Gulu Kids Fun", "Gulu", 120000, "day", "flat", {
    rating: 4.4, reviews: 9, summary: "bouncing castle", included: ["One castle for up to 12 children", "One attendant"],
  }),
  s("play-zone-premium", "games", "Kids' play zone with attendants", "Little Stars Play Zones", "Kampala", 900000, "day", "flat", {
    rating: 4.8, reviews: 22, summary: "play zone", instantConfirm: false,
    included: ["Two castles, a slide and soft play", "Four trained attendants", "Face painting"],
  }),
  s("mbarara-lawn-games", "games", "Lawn games set", "Mbarara Fun Hire", "Mbarara", 100000, "set", "flat", {
    rating: 4.3, reviews: 8, summary: "lawn games", included: ["Sack race, tug of war and ring toss", "Delivery and pick-up"],
  }),
  s("elgon-entertainers", "games", "Magician and face painting, 3 hours", "Elgon Entertainers", "Mbale", 300000, "show", "flat", {
    rating: 4.6, reviews: 11, summary: "magician", included: ["A magician's show", "Face painting for up to 40 children"],
  }),
];

export const OFFER_IDS = ["lakeside-hall", "draped-tent-100", "photo-video", "kids-bundle"];
