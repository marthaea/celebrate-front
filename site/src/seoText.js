// What search engines and link previews (WhatsApp, Facebook, X) see for each page: title,
// description, keywords, share image and structured data (schema.org JSON-LD).
//
// Plain JavaScript with no browser-only code, so three places use it: the website itself (for
// pages opened inside the app), the Netlify edge function that writes it into each page as it is
// served, and the Node server for hosts other than Netlify.
import { CATEGORIES, SERVICES } from "../../server/data.js";
import { PHOTOS } from "./photos.js";
import { POSTS, postBySlug } from "./blog.js";

export const SITE_NAME = "Celebrate";
export const DEFAULT_IMAGE = "/og/celebrate.jpg";
export const DEFAULT_DESCRIPTION =
  "Book every event service in Uganda in one place: venues, tents, catering, cakes, drinks, attire, sound, photography, MCs and games. Compare trusted vendors, see one grand total, and pay by mobile money.";
export const KEYWORDS = [
  "event services Uganda", "introduction ceremony Uganda", "traditional wedding Uganda", "kwanjula", "nyom", "giveaway ceremony",
  "wedding planning Uganda", "event vendors Kampala", "event vendors Gulu", "event vendors Mbarara", "event vendors Mbale",
  "event vendors Arua", "event vendors Jinja", "tent hire Uganda", "catering Uganda", "wedding cakes Uganda", "event venues Uganda",
  "MC Uganda", "event photography Uganda", "PA system hire", "traditional dance troupe Uganda", "graduation party Uganda",
  "party planning Uganda", "traditional attire Uganda", "event budget planner", "mobile money event booking",
];

// Pages that belong to one person or are for staff: kept out of search results.
const PRIVATE = [/^\/account/, /^\/pay(\/|$)/, /^\/receipt\//, /^\/bookings/, /^\/admin/, /^\/vendor$/, /^\/share\//, /^\/verify\//, /^\/plan$/, /^\/compare/];

const money = (n) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
const clip = (text, most = 158) => (text.length > most ? `${text.slice(0, most - 1).replace(/\s+\S*$/, "")}…` : text);

function breadcrumbs(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: path })),
  };
}

/**
 * The search and preview details for a page. `extra.service` is the service shown on a /service/
 * page when it is known (a vendor's own services are not in the sample catalogue).
 */
export function pageMeta(pathname, extra = {}) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const base = { title: `${SITE_NAME} · Book every event service in Uganda, one grand total`, description: DEFAULT_DESCRIPTION, image: DEFAULT_IMAGE, type: "website", path, noindex: false, jsonLd: [] };

  if (PRIVATE.some((pattern) => pattern.test(path))) return { ...base, title: `${SITE_NAME}`, noindex: true };

  if (path === "/") {
    return {
      ...base,
      jsonLd: [
        {
          "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: "/", logo: "/icons/icon-512.png",
          slogan: "Tukusanyukidde. Every event service, one grand total.", areaServed: { "@type": "Country", name: "Uganda" },
        },
        {
          "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: "/",
          potentialAction: { "@type": "SearchAction", target: "/services?q={search_term_string}", "query-input": "required name=search_term_string" },
        },
      ],
    };
  }

  if (path === "/services") {
    return {
      ...base,
      title: `Event services in Uganda: venues, tents, catering and more · ${SITE_NAME}`,
      description: "Compare event vendors across Uganda by district, price and rating: venues, tents and chairs, catering, cakes, drinks, attire, sound, photography, MCs and games.",
      jsonLd: [breadcrumbs([[SITE_NAME, "/"], ["Services", "/services"]])],
    };
  }

  const category = path.match(/^\/services\/([\w-]+)$/) && CATEGORIES.find((c) => c.id === path.split("/")[2]);
  if (category) {
    const count = SERVICES.filter((s) => s.category === category.id).length;
    return {
      ...base,
      title: `${category.title} for introductions, weddings and parties across Uganda · ${SITE_NAME}`,
      description: clip(`Book ${category.title.toLowerCase()} for your introduction, wedding, graduation or party, anywhere in Uganda. Compare ${count}+ vendors by price, district and rating, choose your settings, and see one grand total.`),
      image: PHOTOS[`cat:${category.id}`]?.src ?? DEFAULT_IMAGE,
      jsonLd: [breadcrumbs([[SITE_NAME, "/"], ["Services", "/services"], [category.title, path]])],
    };
  }

  const serviceId = path.match(/^\/service\/([^/]+)$/)?.[1];
  if (serviceId) {
    const service = extra.service ?? SERVICES.find((s) => s.id === decodeURIComponent(serviceId));
    if (!service) return { ...base, noindex: true };
    const categoryTitle = CATEGORIES.find((c) => c.id === service.category)?.title ?? "Event services";
    const image = service.photoUrls?.[0] ?? PHOTOS[service.id]?.src ?? PHOTOS[`cat:${service.category}`]?.src ?? DEFAULT_IMAGE;
    const description = clip(`${service.name} by ${service.vendor} in ${service.district}: ${money(service.price)} per ${service.unit}.${service.included?.length ? ` Includes ${service.included.slice(0, 2).join("; ").toLowerCase()}.` : ""} Book online with Celebrate.`);
    return {
      ...base,
      title: `${service.name} by ${service.vendor}, ${service.district} · ${SITE_NAME}`,
      description, image, type: "product",
      jsonLd: [
        {
          "@context": "https://schema.org", "@type": "Service", name: service.name, serviceType: categoryTitle, description,
          image, url: path, areaServed: { "@type": "AdministrativeArea", name: `${service.district}, Uganda` },
          provider: { "@type": "LocalBusiness", name: service.vendor, address: { "@type": "PostalAddress", addressLocality: service.district, addressCountry: "UG" } },
          offers: { "@type": "Offer", price: service.price, priceCurrency: "UGX", availability: "https://schema.org/InStock", url: path },
          ...(service.reviews > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: service.rating, reviewCount: service.reviews, bestRating: 5 } }),
        },
        breadcrumbs([[SITE_NAME, "/"], ["Services", "/services"], [categoryTitle, `/services/${service.category}`], [service.name, path]]),
      ],
    };
  }

  const postMatch = path.match(/^\/blog\/([^/]+)$/);
  if (postMatch) {
    const post = postBySlug(decodeURIComponent(postMatch[1]));
    if (!post) return { ...base, title: `Page not found · ${SITE_NAME}`, noindex: true };
    const image = PHOTOS[post.photo]?.src ?? post.photo ?? DEFAULT_IMAGE;
    return {
      ...base, title: `${post.title} · ${SITE_NAME}`, description: post.description, image, type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, image,
          datePublished: post.date, dateModified: post.date, mainEntityOfPage: path,
          author: { "@type": "Organization", name: post.author }, publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: "/icons/icon-512.png" } },
        },
        breadcrumbs([[SITE_NAME, "/"], ["Blog", "/blog"], [post.title, path]]),
      ],
    };
  }

  const pages = {
    "/budget": ["Event budget planner for Uganda · " + SITE_NAME, "Tell us your budget and get a complete plan for your introduction, wedding or party, anywhere in Uganda: venue, tents, food, sound and more, with every shilling shown."],
    "/vendors": ["List your event business · " + SITE_NAME, "Tent hire, caterers, venues, cakes, drinks, attire, sound, photographers, MCs and games: bring your business to families planning celebrations across Uganda."],
    "/about": ["About us · " + SITE_NAME, "Why we built Celebrate: one place to find, compare and book every event service in Uganda, with honest prices and checked vendors."],
    "/blog": ["Blog: event planning ideas and guides · " + SITE_NAME, "Budgets, checklists and advice for introductions, weddings, giveaways, graduations and parties across Uganda."],
    "/team": ["Our team · " + SITE_NAME, "Meet the people building Celebrate, the place to find, compare and book event services anywhere in Uganda."],
    "/terms": ["Terms of use for hosts · " + SITE_NAME, "How booking, deposits, cancellations, refunds, delivery and complaints work on Celebrate."],
    "/privacy": ["Privacy notice · " + SITE_NAME, "What Celebrate collects, why, who sees it, and your rights under Uganda's Data Protection and Privacy Act."],
    "/vendor-agreement": ["Vendor agreement · " + SITE_NAME, "What vendors agree to when they list on Celebrate: accurate listings, answering within 24 hours, delivery, payouts and complaints."],
  };
  if (pages[path]) return { ...base, title: pages[path][0], description: pages[path][1] };

  return { ...base, title: `Page not found · ${SITE_NAME}`, noindex: true };
}

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const absolute = (origin, url) => (/^https?:/.test(url) ? url : `${origin}${url}`);

/** Makes every relative URL in structured data absolute. */
function absoluteLd(value, origin) {
  if (typeof value === "string") return value.startsWith("/") ? `${origin}${value}` : value;
  if (Array.isArray(value)) return value.map((v) => absoluteLd(v, origin));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "query-input" ? v : absoluteLd(v, origin)]));
  return value;
}

/** The tags for a page's <head>, as HTML. `verification` is the Google Search Console HTML-tag code, if any. */
export function renderHead(meta, origin, { verification } = {}) {
  const url = `${origin}${meta.path === "/" ? "/" : meta.path}`;
  const image = absolute(origin, meta.image);
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
    `<meta name="keywords" content="${escape(KEYWORDS.join(", "))}" />`,
    `<meta name="robots" content="${meta.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}" />`,
    `<link rel="canonical" href="${escape(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_UG" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta property="og:image:alt" content="${escape(meta.title)}" />`,
    ...(meta.image === DEFAULT_IMAGE ? ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />'] : []),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escape(meta.title)}" />`,
    `<meta name="twitter:description" content="${escape(meta.description)}" />`,
    `<meta name="twitter:image" content="${escape(image)}" />`,
    ...(verification ? [`<meta name="google-site-verification" content="${escape(verification)}" />`] : []),
    ...meta.jsonLd.map((ld) => `<script type="application/ld+json">${JSON.stringify(absoluteLd(ld, origin)).replace(/</g, "\\u003c")}</script>`),
  ];
  return tags.join("\n    ");
}

/** Puts the tags between the <!-- seo --> markers in index.html. */
export function injectHead(html, head) {
  return html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, `<!-- seo:start -->\n    ${head}\n    <!-- seo:end -->`);
}

/** sitemap.xml for the pages worth finding: home, browsing, every live service, and the public pages. */
export function renderSitemap(origin, services) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ["/", "1.0"], ["/services", "0.9"], ...CATEGORIES.map((c) => [`/services/${c.id}`, "0.8"]),
    ...services.map((s) => [`/service/${encodeURIComponent(s.id)}`, "0.7", (s.updatedAt ?? s.createdAt ?? "").slice(0, 10)]),
    ["/budget", "0.6"], ["/vendors", "0.5"], ["/about", "0.5"], ["/blog", "0.6"], ...POSTS.map((p) => [`/blog/${p.slug}`, "0.5", p.date]), ["/team", "0.4"], ["/terms", "0.2"], ["/privacy", "0.2"], ["/vendor-agreement", "0.2"],
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(([path, priority, modified]) => `  <url><loc>${escape(origin + path)}</loc><lastmod>${modified || today}</lastmod><priority>${priority}</priority></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

export function renderRobots(origin) {
  return [
    "User-agent: *",
    // Personal and staff pages. "$" ends the match, so /vendor does not block /vendors.
    "Disallow: /admin",
    "Disallow: /vendor$",
    "Disallow: /account",
    "Disallow: /pay",
    "Disallow: /receipt/",
    "Disallow: /bookings",
    "Disallow: /share/",
    "Disallow: /verify/",
    "Disallow: /plan$",
    "Disallow: /compare",
    "Disallow: /api/",
    "Allow: /api/uploads/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
