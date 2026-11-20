# The agreed workflow, step by step

Each step of the workflow, where it happens on the website, the API route behind it (see
[API.md](API.md)), and the automated test that checks it (`tests/workflow.js` unless noted).

## A. Host / customer registration

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. Host taps Sign up, enters name and phone number | `/account`, "I am new here" | `POST /api/customers/code` (Turnstile) | A |
| 2. System sends an OTP code by SMS | "We sent a code to…" (shows the code while SMS is simulated) | same | A |
| 3. Host enters the code; wrong code: retry, up to three times | Code field; "You have 2 tries left"; after three, "Ask for a new code" | `POST /api/customers/verify` | A |
| 4. Host accepts the terms and privacy notice by ticking a box | "Code accepted. One last step." with the box; links to `/terms` and `/privacy` | same, with `acceptTerms` | A |
| 5. System creates the account and opens the home page | Home page, greeting the host by name | same | A |

Signing in later: `/account`, "I have an account", phone number, then a code. No password.

## B. Vendor onboarding

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. Vendor taps "List my business": business name, category, district and contacts | `/vendors` | `POST /api/vendors/apply` (Turnstile) | B |
| 2. Vendor uploads proof (registration certificate or national ID) and photos of past work | `/vendor`, step 2 | `POST /api/uploads`, `POST /api/vendor/application/documents` | B |
| 3. Vendor adds services with prices, discounts and available dates | `/vendor`, steps 3 and 4 (and the Services and Calendar tabs once approved) | `POST /api/vendor/services`, `POST /api/vendor/busy` | B |
| 4. Vendor accepts the vendor agreement electronically | `/vendor`, step 5 (tick and type their name); text at `/vendor-agreement` | `POST /api/vendor/application/agreement`, then `…/submit` | B |
| 5. Admin reviews. Approved: listing goes live. Rejected: vendor gets the reason and can resubmit | `/admin`, Applications; the vendor sees the reason on `/vendor` and "Submit again" | `GET /api/admin/applications`, `POST /api/admin/vendors/:id` | B |

## C. Browse and build a plan

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. Host picks a category or searches | `/services`, category chips and search | `GET /api/services` | C |
| 2. Host filters by district, price and rating | District, Price, Rating and Sort on `/services` | same, with `district`, `maxPrice`, `minRating`, `sort` | C |
| 3. Host opens a listing and taps "Add to my plan" | `/service/:id`, with its own settings ("Make it yours") and live price | `GET /api/services/:id` | Settings |
| 4. Host repeats for each service needed | | | |
| 5. Host enters guests, event date, location and who handles setup | `/plan` | `POST /api/quote` | C |
| 6. System checks each vendor is free that day; not free: suggests similar vendors | `/plan` ("Swap") and `/service/:id` ("Free on … instead") | `POST /api/availability` (`similar`) | C |

## D. Grand total and payment

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. System adds item costs, labour, transport and the platform fee | `/plan` and `/pay` summary | `POST /api/quote` | `tests/pricing.js` |
| 2. Host reviews and edits the plan if the total is too high | `/plan` (change settings, remove, swap), link from `/pay`, `/budget` | | |
| 3. Host chooses a payment method and confirms | `/pay` (30% deposit now, balance on the day) | `POST /api/bookings` with `prompt: true` | D |
| 4. Payment partner sends a prompt to the host's phone; the host enters their PIN | `/pay/:id`, "Check your phone" (simulated: approves itself, or demo buttons) | `GET /api/payments/:id` | D |
| 5. Paid: e-receipt issued, vendors notified. Failed: host retries or changes method | `/receipt/:id` (confetti, PDF with QR code); on failure `/pay/:id` offers "Try again" with any method | `POST /api/bookings/:id/payments` | D |

## E. Delivery and vendor payout

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. Each vendor accepts the booking within 24 hours | Vendor workspace, "Answer by…", Accept or Decline; host sees "Waiting… by"; admin sees overdue answers | `POST /api/vendor/bookings/:id/status` | E |
| 2. System reminds host and vendors 7 days and 1 day before | Bell in the header (host); notifications in the vendor workspace | `GET /api/me/notifications`, `GET /api/vendor/overview` | E |
| 3. Vendor marks "Delivered" on the day | Vendor workspace, "Mark delivered" (only from the event date) | `POST /api/vendor/bookings/:id/lines/:serviceId/delivered` | E |
| 4. Host confirms delivery; no answer in 48 hours: confirmed automatically | `/receipt/:id`, "Confirm delivery" and the deadline | `POST /api/bookings/:id/lines/:serviceId/confirm` | E |
| 5. System pays the vendor the price less the platform fee | Vendor workspace ("paid out…"); admin Payments | automatic | E |

## F. Cancellation, refund and complaint

| Step | Screen | Route | Checked by |
| --- | --- | --- | --- |
| 1. Host or vendor taps Cancel and picks a reason | Host: `/receipt/:id`, "Cancel this booking". Vendor: Decline or Cancel in the workspace | `POST /api/bookings/:id/cancel`; `POST /api/vendor/bookings/:id/lines/:serviceId/cancel` | F (both) |
| 2. System applies the refund rule by how early the cancellation is | Shown before confirming: days to go, the rule, the amount | `GET /api/bookings/:id/cancellation` | F: the host cancels |
| 3. Vendor cancels: admin offers a replacement vendor or a full refund | Admin, Cases: "Find a replacement free that day" or "Full refund for this vendor"; host sees the outcome | `GET /api/admin/cases/:id/replacements`, `POST /api/admin/cases/:id/resolve` | F: a vendor cancels |
| 4. Host complains after the event: admin reviews evidence from both sides within three working days | Host: "Report a problem" with photos. Vendor: Cases, "Your side" with evidence. Admin: Cases, both sides and the deadline | `POST /api/bookings/:id/lines/:serviceId/complaint`, `POST /api/vendor/cases/:id/respond` | F: a complaint |
| 5. System sends the refund to the original payment method and records the case | Host: Refunds on the receipt; admin: Payments and settled cases | `POST /api/admin/cases/:id/resolve` | F: a complaint |

## Decisions made where the workflow left it open

These are choices in the build that the team may want to change:

- **Deposit.** Hosts pay 30% to book and the balance on the day (requested earlier), rather than the
  full amount in step D.
- **Refund rule.** 30 days or more before the event: everything paid comes back; 8 to 29 days: half;
  7 days or less: nothing.
- **Vendor replacement.** The host keeps their original price; Celebrate covers any difference.
- **A vendor who does not answer in 24 hours** is flagged to the admin, who can treat it as a decline
  (which opens a replacement-or-refund case). Nothing happens automatically.
- **Complaints** can be made once per vendor per booking, from the event date until 7 days after
  delivery is confirmed. The vendor is not paid until the admin decides; any refund comes out of
  their payout.
- **Platform fee.** The host pays vendors' prices plus 3%; the vendor receives their full price. This
  matches "the price less the platform fee" when the price is what the host paid.
