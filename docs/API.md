# Celebrate API contract

This is the contract between the website (`site/`) and the backend. The `server/` folder is a
working stand-in that answers every route below, so the front end can be built, tested and
demonstrated end to end. A real backend that answers the same routes with the same shapes can
replace it without changing the website.

What the stand-in **simulates**, and the backend must make real, is listed under
[What is simulated](#what-is-simulated). The step-by-step workflow (A to F) and which screen and
route covers each step is in [WORKFLOW.md](WORKFLOW.md).

## Conventions

- JSON in and out. Every route is under `/api`.
- Errors: a 4xx or 5xx status with `{ "error": "A sentence the site shows as it is." }`. Some errors
  add fields the site reads: `triesLeft`, `expired`, `needsTerms`, `missing`, `unavailable`.
- Money is whole Uganda shillings (integers). Dates are `YYYY-MM-DD`; times are ISO 8601 in UTC.
- Signing in returns a token. Send it as `Authorization: Bearer <token>`. Tokens carry a role:
  - `customer` (a host): 30 days.
  - `vendor`: 12 hours.
  - `admin`: 12 hours.
- `401` means "sign in again"; the site signs the person out. `403` means "signed in, but not allowed".
- Phone numbers and email addresses are removed from anything one side writes for the other to read
  (messages, settings, reviews, complaints): they become `[number removed]` / `[email removed]`.
- Cloudflare Turnstile: routes marked **(Turnstile)** take a `token` field from the widget and check it
  with Cloudflare before doing anything else.

## Core shapes

**Service**
```json
{ "id": "buffet", "category": "catering", "name": "Buffet, local and continental", "vendor": "Mama's Kitchen",
  "vendorId": "mama-s-kitchen", "district": "Mukono", "price": 35000, "unit": "plate", "qtyRule": "perGuest",
  "wasPrice": null, "rating": 4.7, "reviews": 63, "verified": true, "labour": 600000, "labourPerQty": 0,
  "transport": 150000, "instantConfirm": false, "included": ["…"], "photoUrls": ["/api/uploads/…"] }
```
`qtyRule`: `flat` (one per event), `perGuest`, `per100Guests` (rounded up), `perTent`.
`GET /api/services/:id` adds `options`, the settings a host can choose (see below).

**Options (service settings)**. Defined per category in `server/options.js`, which the website also
imports to show live prices. Each option is `{ id, label, type: "one" | "many" | "text", choices }`;
each choice may have `mult` (multiplies the unit price), `perUnit` (shillings added per unit) and
`flat` (shillings added once). The first choice of a `one` option is the default and changes nothing.
A host's settings for a service: `{ "menu": "local", "service": "served", "extras": ["dessert"], "diet": "20 vegetarian" }`.

**Event**
```json
{ "type": "Introduction", "guests": 250, "tents": 6, "date": "2026-12-12", "district": "Mukono",
  "setup": "vendor", "location": "Seeta, behind the church" }
```
`type` is one of the event types in `/api/meta` (Introduction, Wedding, Giveaway, Graduation, Cultural ceremony, Party, Bridal shower, Baby shower, Birthday, Christening, Proposal, Corporate event); the old name `Kwanjula` is still accepted and stored as `Introduction`. `district` is one of the listed districts or any typed place name (letters only, up to 40 characters). `setup`: `vendor` (labour charged) or `self`. `location` is optional, up to 120 characters.

**Quote** (the grand total)
```json
{ "lines": [{ "id": "buffet", "category": "catering", "name": "…", "vendor": "…", "qty": 250, "unit": "plate",
              "unitPrice": 40000, "amount": 10000000, "detail": "buffet × 250 plates",
              "choices": { "…": "…" }, "settings": "Served at the table", "labour": 600000, "transport": 150000,
              "due": 10750000 }],
  "itemCost": 0, "labour": 0, "transport": 0, "platformFee": 0, "feeRate": 0.03, "total": 0 }
```
`due` is what the vendor is paid for the line (amount + labour + transport). The 3% platform fee is on top.

**Booking**
```json
{ "id": "CLB-000123", "createdAt": "…", "customer": "Nantongo", "customerId": "CUS-…",
  "event": {}, "quote": {}, "choices": {},
  "status": "awaiting_payment | active | cancelled",
  "total": 0, "paid": 0, "balance": 0, "depositRate": 0.3, "method": "MTN Mobile Money",
  "payments": [Payment], "refunds": [Refund], "vendors": [VendorLine],
  "cancellation": { "by": "customer", "reason": "…", "at": "…", "rate": 0.5, "rule": "…", "refund": 0 } }
```
`GET /api/bookings/:id` also returns `cases` (this booking's cases) and `refundRule`.

**VendorLine** (one vendor's part of a booking)
```json
{ "serviceId": "buffet", "category": "Catering", "vendor": "Mama's Kitchen", "vendorId": "mama-s-kitchen",
  "status": "Waiting | Confirmed | Declined | Cancelled | Replaced | Refunded",
  "respondBy": "…", "acceptedAt": "…", "deliveredAt": "…", "confirmedAt": "…", "autoConfirmed": false,
  "hold": "CASE-0002", "cancelled": { "by": "vendor | customer | admin", "reason": "…", "at": "…" },
  "payout": { "status": "waiting | paid | none", "amount": 0, "paidAt": "…" }, "replaces": "old-service-id" }
```

**Payment**
```json
{ "id": "PAY-…", "kind": "deposit | full | balance", "amount": 0, "method": "mtn", "methodName": "MTN Mobile Money",
  "phone": "••• 456", "status": "pending | succeeded | failed", "createdAt": "…", "settledAt": "…", "reason": "…" }
```

**Refund**: `{ "id": "REF-…", "amount": 0, "reason": "…", "method": "MTN Mobile Money", "at": "…", "serviceId": "…", "caseId": "…" }`

**Case**
```json
{ "id": "CASE-0001", "type": "vendor-cancel | complaint", "status": "open | resolved", "bookingId": "…",
  "serviceId": "…", "vendorId": "…", "vendor": "…", "customerId": "…", "customer": "…", "text": "…",
  "evidence": ["upload id"], "openedAt": "…", "dueBy": "…",
  "response": { "text": "…", "evidence": ["…"], "at": "…" },
  "resolution": { "action": "replacement | refund | dismiss", "amount": 0, "sentBack": 0, "serviceId": "…", "vendor": "…", "note": "…", "at": "…" } }
```
Admin and vendor views replace evidence ids with `{ id, name, type, size, purpose, url }`.

**Vendor (account)**
```json
{ "id": "jinja-grill-house", "name": "Jinja Grill House", "owner": "…", "about": "…", "category": "catering",
  "district": "Jinja", "contacts": { "phone": "…", "email": "…" },
  "status": "draft | pending | approved | rejected | suspended", "verified": true,
  "proofs": { "certificate": "upload id", "nationalId": "upload id" }, "workPhotos": ["upload id"],
  "agreement": { "version": "2026-11", "at": "…", "name": "…" }, "submittedAt": "…",
  "review": { "decision": "rejected", "reason": "…", "at": "…" } }
```
Contacts and proofs are never shown to hosts.

## Routes

### Catalogue and planning (anyone)

| Route | Body or query | Returns |
| --- | --- | --- |
| `GET /api/meta` | | event types and `eventNotes`, districts, categories (with `visit`), payment methods, `depositRate`, `feeRate`, `options`, `rules` (`respondHours`, `confirmHours`, `caseWorkingDays`, `refunds`), `versions`, `turnstile`, `simulated`, `demo` |
| `GET /api/services` | `category`, `q`, `district` (a district, or `other` for places outside the list), `minPrice`, `maxPrice`, `minRating`, `filter` (`under500k`, `top`, `offers`), `sort` (`price`, `-price`, `rating`) | `[Service]` |
| `GET /api/services/:id` | | `Service` with `options` |
| `GET /api/offers` | | `[Service]` |
| `POST /api/quote` | `{ event, items: [serviceId], choices: { serviceId: settings } }` | `Quote` |
| `POST /api/options` | `{ event }` | every service per category with its all-in cost (budget planner, compare) |
| `GET /api/services/:id/availability` | `month=YYYY-MM` | `{ month, booked: [date] }` |
| `POST /api/availability` | `{ date, items }` | `{ unavailable: [id], nextFree: date, similar: { id: [Service-ish] } }` |
| `GET /api/services/:id/slots` | `date` | `{ kind, free: ["09:00", …], atEvent }` for tastings, fittings, viewings |
| `GET /api/services/:id/reviews` | | reviews left on the site |
| `GET /api/health` | | `{ ok, database, time }`: is the API up? |
| `GET /sitemap.xml`, `GET /robots.txt` | | the sitemap of public pages (home, categories, every service) and the crawler rules; also at `/api/sitemap.xml` and `/api/robots.txt` |
| `GET /api/pledges/:key`, `POST /api/pledges/:key` | `{ name, amount, towards }` | pledges on a shared plan (promises, no money) |

### Host accounts (workflow A)

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/customers/code` **(Turnstile)** | `{ phone, purpose: "signup" \| "signin", name (signup), token }` | `{ sent, phone, expiresInMinutes, tries: 3, demoCode? }`. 409 if signing up with a number that has an account; 404 if signing in without one; 429 after 3 codes per number in 10 minutes |
| `POST /api/customers/verify` | `{ phone, code, acceptTerms }` | sign up: `201 { token, customer }`; sign in: `{ token, customer }`. Wrong code: `401 { triesLeft }`; third wrong code or expired: `429/410 { expired: true }`; right code but terms not accepted: `400 { needsTerms: true }` |
| `GET /api/me`, `POST /api/me` | `{ name }` | the host; changes the name |
| `GET /api/me/bookings` | | the host's bookings |
| `GET /api/me/appointments` | | the host's tastings, fittings and viewings |
| `GET /api/me/notifications` | | `[{ id, at, text, link }]`, newest first, including reminders 7 days and 1 day before |
| `GET /api/me/data` | | everything held about the host as one JSON object (account, bookings, appointments, notifications, reviews); the account page offers it as a download |
| `POST /api/me/delete` | `{ confirm: true }` | deletes the account (`400` without `confirm`); the site then signs out |

### Booking, payment, delivery, cancellation (workflows D, E, F) — host

All need the host's token unless the booking has no owner (made by the earlier phone-app version).

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/bookings` | `{ event, items, choices, payment: { method, phone }, deposit: true, prompt: true }` | `201 Booking` with `status: "awaiting_payment"` and one pending payment. 409 `{ unavailable }` if a vendor is taken |
| `GET /api/bookings/:id` | | `Booking` with `cases` |
| `POST /api/bookings/:id/payments` | `{ kind: "deposit" \| "balance", payment: { method, phone } }` | `201 Payment` (pending). Retry after a failure, or pay the balance |
| `GET /api/payments/:id` | | `Payment` with `booking: { id, status, paid, balance, total }`. The site asks every 2 seconds while pending |
| `POST /api/payments/:id/simulate` | `{ outcome: "succeeded" \| "failed" }` | stand-in only: acts as the host's phone |
| `GET /api/bookings/:id/cancellation` | | `{ daysBefore, rule, rules, refund, paid }`, before cancelling |
| `POST /api/bookings/:id/cancel` | `{ reason }` | the cancelled `Booking`, refund applied |
| `POST /api/bookings/:id/lines/:serviceId/confirm` | | confirms delivery; the vendor is paid |
| `POST /api/bookings/:id/lines/:serviceId/complaint` | `{ text, evidence: [uploadId] }` | `201 Case`; the vendor's payout is held |
| `GET /api/bookings/:id/messages`, `POST …/messages` | `{ serviceId, text }` | messages with that booking's vendors |
| `POST /api/bookings/:id/reviews` | `{ serviceId, rating, text }` | once per vendor, after the event or once paid in full |
| `GET /api/bookings/:id/verify` | | what a vendor scanning the receipt's QR code may see (no contacts) |
| `POST /api/appointments`, `POST /api/appointments/:id/cancel` | `{ serviceId, date, time }` | tastings, fittings, viewings |
| `POST /api/bookings/:id/balance` | `{ payment }` | earlier phone-app version only: pays the balance at once |
| `GET /api/bookings` | | earlier phone-app version only: bookings without an owner |

### Vendors (workflow B, and the vendor side of E and F)

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/vendors/apply` **(Turnstile)** | `{ business, owner, category, district, phone, email, about, password, token }` | `201 { token, role, vendor }` with `status: "draft"` |
| `POST /api/staff/login` **(Turnstile)** | `{ role: "vendor", name, password, token }` | `{ token, role, vendor }`. Draft, pending and rejected vendors can sign in to their application |
| `GET /api/vendor/application` | | `{ vendor, proofs, workPhotos, services, busy, categories, units, qtyRules, agreementVersion, missing }` |
| `POST /api/vendor/application` | `{ owner, about, category, district, phone, email }` | B1 details and contacts |
| `POST /api/vendor/application/documents` | `{ certificate, nationalId, workPhotos: [uploadId] }` | B2 proof and photos |
| `POST /api/vendor/services` | `{ id?, category, name, price, wasPrice, unit, qtyRule, labour, labourPerQty, transport, included, summary, photoIds }` | B3: adds or changes a service |
| `POST /api/vendor/services/:id/remove` | | removes it (bookings keep it) |
| `POST /api/vendor/busy` | `{ date, busy }` | B3 days the vendor cannot work |
| `POST /api/vendor/application/agreement` | `{ accept: true, name }` | B4 |
| `POST /api/vendor/application/submit` | | status `pending`; 400 `{ missing }` if a step is not done |
| `GET /api/vendor/overview` | | approved vendors: bookings (with each line's state and `due`), messages, visits, reviews, busy days, cases, notifications |
| `POST /api/vendor/bookings/:id/status` | `{ serviceId, status: "Confirmed" }` or `{ serviceId, status: "Declined", reason }` | E1: accept, or decline (opens a case) |
| `POST /api/vendor/bookings/:id/lines/:serviceId/cancel` | `{ reason }` | F1: cancel an accepted booking (opens a case) |
| `POST /api/vendor/bookings/:id/lines/:serviceId/delivered` | | E3: on or after the event date |
| `POST /api/vendor/bookings/:id/messages` | `{ serviceId, text }` | |
| `POST /api/vendor/visits/:id` | `{ status: "Confirmed" \| "Declined" }` | answers an appointment |
| `POST /api/vendor/cases/:id/respond` | `{ text, evidence }` | F4: the vendor's side of a complaint |

### Files

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/uploads` | `{ purpose: "proof" \| "work" \| "service" \| "evidence", name, type, data (base64 or data URL) }` | `201 { id, name, type, size, url }`. Hosts and vendors only. JPEG, PNG, WebP or PDF, up to 2.5 MB. The site shrinks photos to 1600 px first |
| `GET /api/uploads/:id` | | the file. `work` and `service` files are public; `proof` and `evidence` only for the owner, the admin and people added to the case |

### Admin

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/staff/login` **(Turnstile)** | `{ role: "admin", password, token }` | `{ token, role }` |
| `GET /api/admin/overview` | | `totals` (value, collected, refunded, outstanding, fees, owed and paid to vendors, open cases, overdue answers), vendors with their record, bookings with payments and refunds, payouts per line, visits, reviews, cases (with evidence) |
| `GET /api/admin/applications` | | draft, pending and rejected vendors with contacts, proofs, photos, services, agreement and `missing` |
| `POST /api/admin/vendors/:id` | `{ action: "approve" }`, `{ action: "reject", reason }`, `suspend`, `restore`, `verify`, `unverify`, `{ action: "password", password }` | B5 and account management |
| `POST /api/admin/vendors` | `{ business, owner, category, district, password }` | adds an already-checked vendor, approved |
| `GET /api/admin/audit` | | the audit log, newest first: staff sign-ins, admin decisions and deleted accounts. The dashboard's Audit log tab reads a list, or `{ entries \| items \| audit \| log \| rows }`, with fields such as `at`, `actor`, `action`, `target`, `detail` |
| `GET /api/admin/cases/:id/replacements` | | same-category services free on the event date |
| `POST /api/admin/cases/:id/resolve` | vendor-cancel: `{ action: "replacement", serviceId }` or `{ action: "refund" }`; complaint: `{ action: "refund", amount, note }` or `{ action: "dismiss", note }` | F3, F4 |
| `POST /api/admin/bookings/:id/lines/:serviceId/no-response` | | treats a vendor who did not answer within 24 hours as having declined (opens a case) |
| `GET /api/admin/customers`, `POST /api/admin/customers/:id` | `{ action: "suspend" \| "restore" }` | host accounts |
| `POST /api/admin/reviews/:id/remove` | | |

## Rules the backend must keep

| Rule | Value | Where in the stand-in |
| --- | --- | --- |
| Platform fee, on top of vendors' prices | 3% | `server/pricing.js` |
| Deposit to book; balance on the day | 30% | `server/pricing.js` |
| Wrong SMS codes before a new one is needed | 3; codes last 10 minutes; at most 3 codes per number per 10 minutes | `server/customers.js` |
| Vendor must accept or decline | within 24 hours of payment | `server/orders.js` |
| Unpaid booking holds its vendors' dates | 15 minutes | `server/availability.js` |
| Delivery confirms itself | 48 hours after "Delivered" | `server/orders.js` |
| Complaint decided within | 3 working days | `server/orders.js` |
| Host cancellation refund | 30+ days: 100%; 8 to 29 days: 50%; 7 days or less: 0% | `server/orders.js` |
| Vendor cancels | admin offers a same-kind replacement at the host's original price, or a full refund of that vendor's all-in cost | `server/orders.js` |
| Vendor payout | line `due` minus any refund on that line, released on confirmation unless a complaint holds it | `server/orders.js` |
| Reminders | 7 days and 1 day before the event | `server/orders.js` |

## What is simulated

| Thing | The stand-in | The real backend |
| --- | --- | --- |
| SMS codes | No SMS is sent. The code is returned as `demoCode` while `SMS_PROVIDER` is unset | Send the code by SMS (for example Africa's Talking). **Never return the code** |
| Payments | A payment approves itself after 6 seconds, or by `/simulate` | Ask the payment partner (MTN MoMo, Airtel Money, card, bank) to prompt the host; mark the payment from the partner's webhook. Remove `/simulate` |
| Refunds and payouts | Recorded as done | Send them through the payment partner and record the reference |
| Notifications and reminders | Shown in the site's notification lists | Also send by SMS |
| Files | Kept in the same store as everything else | Object storage; identity documents encrypted |
| Storage | Memory locally, Netlify Blobs when hosted | A database. Reads and writes in the stand-in are not safe under heavy concurrent use |
| Time-based steps (auto-approval, auto-confirmation, payouts) | Applied whenever bookings are read | A scheduled job |
| Turnstile | Real Cloudflare check; Cloudflare's test keys until `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set | Same |
| Admin and vendor passwords | Demo passwords until `ADMIN_PASSWORD` is set | Real accounts |

The earlier phone-app version (`src/`) still calls `POST /api/bookings` without `prompt`, which takes
the payment as approved at once, and reads `GET /api/bookings`. Keep those working if the phone app
is still demonstrated, or retire it.
