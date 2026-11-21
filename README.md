# CELEBRATE · Tukusanyukidde

Every event service. One platform. One grand total.

A phone-first React app with a Node (Express) API, built from the eight-screen wireframe:
Welcome → Home → Browse → Service → Details → Total → Pay → Receipt.

## Run it

```sh
npm install
npm run dev
```

Open http://localhost:5174. The API runs on http://localhost:3001 and Vite forwards `/api` to it.

For a production-style run, one Node server serves both the API and the built app:

```sh
npm run build
npm start
```

Then open http://localhost:3001.

```sh
npm test
```

checks the pricing rules, including that the wireframe's sample plan adds up to UGX 16,995,000.

## Two front ends, one API

| | Phone app | Website |
| --- | --- | --- |
| Folder | `src/` | `site/` |
| Look | App-style screens from the wireframe | Editorial, gallery-style pages for wide screens (also works on phones) |
| Develop | `npm run dev` → http://localhost:5174 | `npm run dev:site` → http://localhost:5175 |
| Build and serve | `npm run build && npm start` | `npm run build:site && npm run start:site` |

Both do the same things: browse and search services, build a plan, enter event details, see the grand total, pay, get a receipt, and follow bookings. The website reuses the phone app's API client and plan logic (`src/api.js`, `src/plan.jsx`, `src/format.js`). On the website, the event details and the grand total share one page, and the total updates as you type.

## Layout

| Path | What it holds |
| --- | --- |
| `server/index.js` | API routes; serves `dist/` when it exists |
| `server/data.js` | Sample catalogue: categories, services, districts, payment methods |
| `server/pricing.js` | Quantities, labour, transport, 3% platform fee, grand total |
| `src/screens/` | One file per screen |
| `src/components/ui.jsx` | Shared pieces: pattern strip, logo, bottom navigation, plan bar |
| `src/plan.jsx` | The customer's plan and event details, kept in the browser |
| `src/styles.css` | Colours and all styling |
| `site/src/pages/` | The website's pages |
| `site/src/components.jsx` | The website's header, footer, service card, plan summary and picture stand-ins |
| `site/src/styles.css` | The website's styling |

## API

| Route | Purpose |
| --- | --- |
| `GET /api/meta` | Event types, districts, categories, payment methods |
| `GET /api/services?category=&q=&filter=` | Browse and search; `filter` is `under500k`, `top` or `offers` |
| `GET /api/services/:id` | One service |
| `GET /api/offers` | Offers this week |
| `POST /api/quote` | `{ event, items }` → line items and grand total |
| `POST /api/bookings` | `{ event, items, payment, customer }` → booking with receipt number |
| `GET /api/bookings`, `GET /api/bookings/:id` | Bookings |
| `GET /api/bookings/:id/receipt` | Downloadable e-receipt (text) |

## Not real yet

- **Payments.** No money moves. `POST /api/bookings` checks the details and records the booking; a payment provider still has to be connected there.
- **Catalogue and photos.** Vendors, prices, ratings and reviews in `server/data.js` are sample data, and photos are patterned stand-ins.
- **Storage.** Bookings are held in memory and are lost when the server restarts.
- **Accounts.** "Log in" only remembers a name on the device. Vendor sign-up is a holding page.

## Hosting on Netlify

`netlify.toml` builds the website (`site/`) and runs the API as a Netlify Function
(`netlify/functions/api.js`), so connecting the repository to Netlify is enough; no settings
need to be entered by hand. Bookings are kept in the function's memory, so they can vanish
between requests on Netlify until a database is added.

## Photographs and fonts (website)

The website's photographs are stock pictures from [Pexels](https://www.pexels.com/license/), which
are free to use without payment or credit. They illustrate each kind of service and are not
pictures of the listed vendors. The files are in `site/public/photos`, named by their Pexels photo
number (photo 123 is at `pexels.com/photo/123`), and `site/src/photos.js` says which picture goes
where. The fonts are Bricolage Grotesque and DM Sans, both under the SIL Open Font License.

## What the website adds beyond the booking flow

| Feature | Where | Notes |
| --- | --- | --- |
| Budget planner | `/budget` | Builds a plan that fits a budget (`site/src/budget.js`); every part can be swapped. |
| Shared plan and pledges | `/share/<code>` | The plan travels inside the link. Pledges are promises, not payments. |
| Countdown and checklist | receipt page | Ticks are kept on the device. |
| Install and offline use | `site/public/sw.js`, `manifest.webmanifest` | Built site only. Pages already opened work offline; prices and booking need a connection. |
| Compare | tick boxes on `/services`, then `/compare` | Up to three services, costed for the customer's event. |
| Availability | calendar on each service; warning on the plan | Days booked through the site plus days vendors mark busy (`server/availability.js`); similar free vendors are suggested. |
| PDF receipt with QR code | receipt page | The code opens `/verify/<receipt no.>`, where a vendor can check the booking. |
| Confetti, drum beat, sample plan | receipt page; home page | Skipped for visitors who ask for reduced motion. |

Bookings and pledges go through `server/store.js`: memory by default, Netlify Blobs when hosted on
Netlify (`netlify/functions/api.js`). Replace it with a database when the real backend arrives.

## Deposits, messages, appointments and the login check

| Feature | Where | Notes |
| --- | --- | --- |
| Deposit now, balance on the day | pay page, receipt page | 30% deposit (`DEPOSIT_RATE` in `server/pricing.js`). The balance can be paid from the receipt on the day or before. The phone app still pays in full. |
| Messages with vendors | receipt page and vendor workspace | Phone numbers and email addresses are removed from messages (`hideContacts` in `server/core.js`). |
| Appointments | "before you book" on each service; listed under Bookings | Tastings, fittings, viewings; the kind comes from the category (`visit` in `server/data.js`). |
| Privacy page | `/privacy` | A draft: needs legal review and contact details before launch. |
| Sign-in check | sign-in pages | Cloudflare Turnstile, on customer, vendor and admin sign-in and on vendor applications. |

### Turning on the real Cloudflare check

Until keys are set, the login uses Cloudflare's public test keys, which always pass. To make it real:

1. In the Cloudflare dashboard open **Turnstile**, add a widget, and enter the site's address (the Netlify address and any custom domain).
2. Cloudflare gives a **site key** and a **secret key**.
3. In Netlify open **Site configuration → Environment variables** and add `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
4. Redeploy. The note about test keys on the log in page disappears.

Keep the secret key out of the repository.

## Vendor workspace, admin dashboard and reviews

| Who | Where | What they do |
| --- | --- | --- |
| A business | `/vendors` | Applies to be listed. The application waits for the admin. |
| Vendor | `/vendor` | Signs in with business name and password. While applying: the five onboarding steps. Once approved: accepts or declines bookings within 24 hours, marks them delivered, cancels with a reason, answers complaints, approves appointments, keeps a calendar and its services, answers messages, and sees reviews and payouts. |
| Admin | `/admin` | Signs in with a password. Reviews applications (approve, or reject with a reason), decides cases, verifies, suspends and adds vendors, sets vendor passwords, manages host accounts, and sees every payment, refund and payout. |
| Customer | receipt page | Reviews each vendor (1 to 5 stars and a few words) once the event has happened or the balance is paid. Reviews update the vendor's rating. |

Availability now comes from two real sources only: events booked through the site and the busy days
vendors mark themselves. A suspended vendor's services disappear from the catalogue and cannot be booked.

### Before real use

Set these on the host (Netlify: **Site configuration → Environment variables**), then redeploy:

- `ADMIN_PASSWORD`: the admin's password. **Until it is set the site is in demo mode**: the admin
  password is `celebrate-admin`, every sample business signs in with `celebrate-vendor`, and both are
  shown on the sign-in pages. Setting it turns all of that off; sample businesses then need a
  password set by the admin.
- `SESSION_SECRET`: a long random string used to sign sign-ins.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: see above. Vendor and admin sign-in and vendor
  applications all go through the same Cloudflare check.

Still to come with the real backend: sending SMS, moving real money, and a database (see
[docs/API.md](docs/API.md#what-is-simulated)).

## The agreed workflow (A to F)

The website follows the workflow agreed for Celebrate: host registration by SMS code, vendor
onboarding with documents and approval, browsing with filters and per-service settings, payment
approved on the host's phone, vendor acceptance, delivery and payout, and cancellations, refunds
and complaints.

- **[docs/WORKFLOW.md](docs/WORKFLOW.md)**: every step, the screen that does it, the route behind
  it and the test that checks it, plus the decisions made where the workflow left room.
- **[docs/API.md](docs/API.md)**: the contract for the real backend: every route, the data
  shapes, the rules, and what the stand-in server simulates.

`npm test` runs `tests/workflow.js`, which walks steps A to F against the API.

## Customer accounts

Hosts sign up with their name and a Ugandan mobile number, confirmed by a code sent by SMS (three
tries), and tick the terms and privacy notice. They sign in later with a new code; there is no
password. The code request goes through the Cloudflare check (`server/customers.js`, page
`/account`). Until an SMS provider is connected the site shows the code on screen. Sign-ins last 30
days on that browser.

- Paying needs an account: the pay page sends signed-out visitors to sign in first and back again.
- A booking made while signed in belongs to that account. Only its owner can open the receipt, message
  its vendors, pay the balance or leave reviews. A stranger with the receipt number is refused.
- Requesting a tasting, fitting or viewing needs an account; the vendor sees the account's name.
- `/bookings` lists the account's bookings and appointments; `/account` changes the name and signs
  out (which also clears this browser's copy of the bookings).
- Vendors never see a customer's phone number. A vendor scanning a receipt's QR code sees what was
  booked, whether it is paid and the customer's first name (`/api/bookings/:id/verify`).
- The admin dashboard has a **Customers** section: search, see bookings and payments per account,
  suspend or restore an account.
- Bookings made without an account (the earlier phone-app version still makes those) stay reachable
  by receipt number, as before.

Sign-in code shared by customers, vendors and the admin (password hashing, signed tokens, the
Cloudflare check) is in `server/auth.js`.

## Search engines (SEO)

- Every page gets its own title, description, keywords, canonical link, social preview
  (`og:*`, `twitter:*`, image `site/public/og/celebrate.jpg`) and structured data (Organization,
  WebSite, Service with price and rating, breadcrumbs). The text lives in `site/src/seoText.js`.
- On Netlify an edge function (`netlify/edge-functions/seo.js`) writes these tags into the page
  before it is sent, so search engines and link previews see them without running JavaScript.
  `npm start` does the same in `server/index.js`. In the browser `site/src/seo.js` updates them as
  you move between pages.
- `/sitemap.xml` lists the public pages and every service; `/robots.txt` keeps private pages
  (accounts, payments, receipts, admin, vendor workspace) out of search results.
- Optional settings: `SITE_URL` (the address to use in links, such as `https://celebrate.ug`) and
  `GOOGLE_SITE_VERIFICATION` (the code from Google Search Console's "HTML tag" method).
- In Google Search Console: add the site, verify it, then submit `https://<your site>/sitemap.xml`
  under Sitemaps.

## Fairness across regions

- Event types are neutral (Introduction, Wedding, Giveaway, Graduation, Cultural ceremony, Party), with
  a short note explaining each; districts cover the Central, Eastern, Northern and Western regions,
  and every area picker has "Other…" for places not on the list.
- MCs list the languages they work in (English, Swahili and 18 Ugandan languages, plus "other").
- The sample businesses are spread across the regions with budget, mid-range and premium prices.
  Their names, prices and ratings are made up for the demonstration.

## About, team and blog pages

- `/about` tells Celebrate's story; edit the words in `site/src/pages/About.jsx`.
- `/team` (and the "Meet the team" row on the home and about pages) reads `site/src/team.js`. Put
  real portraits in `site/public/team/` (about 800 × 1000 pixels) and change each person's `photo`,
  `name`, `role` and `bio`. The grey silhouettes are placeholders.
- `/blog` and `/blog/<slug>` read `site/src/blog.js`. The four posts there are samples; edit them or
  add your own (instructions at the top of the file). Each post gets its own search-engine title,
  description, article data and a sitemap entry automatically.

## The live backend

The team's backend (Node.js, Express, MySQL) is live at `https://celebrate-api.thewtontech.com` and
answers every route in `docs/API.md`. The code in `server/` is now the local stand-in, kept for
tests and for working without the internet.

- **Netlify** forwards `/api/*` to the live backend (`netlify.toml`), so the browser only talks to
  the site's own address. `/sitemap.xml` and `/robots.txt` are written by
  `netlify/edge-functions/sitemap.js` with the site's own domain and the live list of services.
- **On your computer:**
  - `npm run dev:live` starts only the website (http://localhost:5175), using the live backend.
  - `npm run dev:site` starts the website with the local stand-in API, as before.
  - `npm run dev:web:live` is the phone app against the live backend.
- Sign-ins made against the stand-in do not work on the live backend (its tokens are JWTs): a signed-in
  host is signed out automatically; vendors and the admin see "Please sign in again".
- New on the account page: **Download my data** and **Delete my account**. New in the admin
  dashboard: **Audit log**.
- To go back to the stand-in on Netlify, change the `/api/*` rule's `to` in `netlify.toml` to
  `/.netlify/functions/api/:splat`.
- **Cloudflare Pages** ignores `netlify.toml`. There, `functions/` does the same job: `functions/api/[[path]].js`
  forwards `/api/*` to the live backend, and `functions/sitemap.xml.js` and `functions/robots.txt.js`
  write the sitemap and crawler rules. Project settings: root directory `/` (the repository root, so
  `functions/` is found), build command `npm run build:site`, output directory `site/dist`. Optional
  variables: `API_URL` (a different backend) and `SITE_URL`.
- The live backend does not accept calls from other domains (no CORS), so whichever host serves the
  site must forward `/api/*` as above. If it does not, every page that loads data says "Celebrate
  cannot reach its server right now" and the browser console names the address that answered wrongly.
