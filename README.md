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
| English / Luganda | header switch | Main wording only (`site/src/i18n.jsx`); the Luganda needs checking by a fluent speaker. |
| Countdown and checklist | receipt page | Ticks are kept on the device. |
| Install and offline use | `site/public/sw.js`, `manifest.webmanifest` | Built site only. Pages already opened work offline; prices and booking need a connection. |
| Compare | tick boxes on `/services`, then `/compare` | Up to three services, costed for the customer's event. |
| Availability | calendar on each service; warning on the plan | Sample calendar (`server/availability.js`) plus dates booked through the site. |
| PDF receipt with QR code | receipt page | The code opens `/verify/<receipt no.>`, where a vendor can check the booking. |
| Confetti, drum beat, sample plan | receipt page; home page | Skipped for visitors who ask for reduced motion. |

Bookings and pledges go through `server/store.js`: memory by default, Netlify Blobs when hosted on
Netlify (`netlify/functions/api.js`). Replace it with a database when the real backend arrives.

## Deposits, messages, appointments and the login check

| Feature | Where | Notes |
| --- | --- | --- |
| Deposit now, balance on the day | pay page, receipt page | 30% deposit (`DEPOSIT_RATE` in `server/pricing.js`). The balance can be paid from the receipt on the day or before. The phone app still pays in full. |
| Messages with vendors | receipt page, per vendor | Phone numbers and email addresses are removed from messages (`hideContacts` in `server/extras.js`). Vendors have no inbox yet, so only the customer's side is delivered. |
| Appointments | "before you book" on each service; listed under Bookings | Tastings, fittings, viewings; the kind comes from the category (`visit` in `server/data.js`). |
| Privacy page | `/privacy` | A draft: needs legal review and contact details before launch. |
| Login check | log in page | Cloudflare Turnstile. |

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
| Vendor | `/vendor` | Signs in with business name and password. Confirms or declines bookings, approves appointments, marks busy days on a calendar, answers customers' messages, and sees reviews and what they are owed. |
| Admin | `/admin` | Signs in with a password. Approves, rejects, verifies, suspends and adds vendors, sets their passwords, sees every customer payment and balance, records payouts to vendors, sees appointments, and removes reviews. |
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

Still to come with the real backend: customer accounts (a booking is reached by its receipt number,
not a login), vendors adding their own listings, and moving real money.
