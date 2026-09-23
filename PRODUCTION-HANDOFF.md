# Aurum Privée production handoff

This release establishes Aurum Privée as a B2B fragrance catalogue with a digital request-for-quote workflow. It does not expose public pricing or accept orders, payments, delivery selections, or checkout submissions.

Production RFQ evidence: controlled internal request `APQ-263ACAFF6E` was accepted on 23 September 2026, and Resend reported both its buyer acknowledgement and merchant notification as delivered. The request is marked as a test and requires no commercial follow-up.

Do not place credentials in chat, tickets or this repository. Enter them directly in Netlify's encrypted environment settings or share them through an approved password manager.

## Active release model

- Wix remains the private catalogue source and system of record for product data.
- The public catalogue API returns only merchandising fields. Price, compare-at price, stock, tax data, SKUs, barcodes and provider identifiers are not included in anonymous responses.
- Public pages omit prices, geographic references, cart controls and checkout language. `/checkout` redirects to the catalogue and `/saved` redirects to `/quote-list`.
- Buyers build a local quote list, set a quantity and optional note for each product, then provide company and contact details. A successful submission creates an `APQ-…` reference and sends separate customer and merchant emails.
- Quote submission is not an order, reservation, price quote or commercial acceptance. Pricing, minimum quantities, freight, payment and other binding terms are handled privately.
- Staff review requests at `/operations/quotes` and may move them through `new`, `reviewing`, `needs_info`, `quoted` and `closed` states.
- The retained cart, checkout, order, Supabase, Stripe and direct Loyverse implementation is dormant legacy code and is not part of this release.
- The public content now addresses retailers and professional buyers, explains the three-step RFQ journey, and links to a dedicated trade programme. Unapproved minimums, territories, authorization claims, lead times and fulfilment promises remain intentionally absent.

## Runtime requirements

### Netlify and domain

- `NEXT_PUBLIC_SITE_URL=https://aurumprivee.com`
- Independent high-entropy values for `RATE_LIMIT_SECRET`, `SYNC_SECRET`, `HEALTH_MONITOR_SECRET` and `OPERATIONS_SESSION_SECRET`
- A validated `OPERATIONS_PASSWORD` distinct from machine secrets
- `NEXT_PUBLIC_CHECKOUT_ENABLED=false`
- `WIX_CHECKOUT_ENABLED=false`

### Wix catalogue

- `COMMERCE_PROVIDER=wix`
- The existing `NEXT_PUBLIC_WIX_CLIENT_ID`, `WIX_SITE_ID`, `WIX_STOREFRONT_ORIGIN`, `WIX_CATALOG_VERSION` and `WIX_EXPECTED_SKU_COUNT`
- The server-only `WIX_API_KEY`, restricted to this Wix site and the permissions needed by the catalogue integration

Wix commerce configuration does not define the public B2B experience. Do not enable Wix checkout, public pricing or order automations for this release.

### Email and quote storage

- `RESEND_API_KEY` must be a domain-scoped Sending key.
- `RESEND_FROM_EMAIL` must use a verified sender on `aurumprivee.com`.
- `STORE_NOTIFICATION_EMAIL` must point to an actively monitored trade inbox.
- Netlify Blobs stores rate limits and quote requests. A request is persisted before email delivery is attempted so an email failure cannot silently discard the enquiry.

Resend also handles the existing contact and private-list forms. The RFQ acknowledgement clearly states that it is not a price quote, order confirmation or reservation.

## RFQ safeguards

- Requests require a same-origin browser submission and pass per-client plus global rate limits.
- Payloads are strictly validated, bounded to 20 unique products, and allow quantities from 1 to 999.
- Every requested item is resolved again against the private server-side catalogue. Unknown or unavailable products are rejected; browser-supplied names, pricing or inventory are never trusted.
- A client-generated submission UUID provides retry idempotency and prevents duplicate quote records.
- The stored record contains an immutable product snapshot, buyer details, consent, notification state and workflow status.
- The public response contains only the reference and acknowledgement. Staff listing and status updates require an authenticated operations session.
- Quote lists remain on the buyer's device until submitted or cleared.

## Release verification

Before every production deploy:

1. Run lint, TypeScript, unit/contract tests, the production build and `git diff --check`.
2. Run the full Playwright matrix across desktop Chromium, desktop WebKit, 390-pixel Chromium and WebKit, and the 430-pixel Chromium breakpoint.
3. Confirm local catalogue responses contain no private commerce fields.
4. Verify the empty and populated quote-list states visually on desktop and mobile.
5. Publish the release, then run the hosted Playwright suite against the production HTTPS URL so edge security headers are included.
6. Confirm the live `/api/catalog?limit=1` response omits price, stock and provider fields; confirm `/quote-list` loads and `/checkout` redirects.
7. Submit one controlled quote request only when the monitored inbox owner has approved a test. Verify both messages, the staff record and idempotent retry behavior.

The initial B2B RFQ candidate passed 168 unit/contract tests, all 10 focused quote-list journeys across the five browser projects, and a desktop/mobile visual comparison against the established ivory-and-gold design system. Record the final full local and hosted totals in the deployment commit or release log.

## Business decisions still required

- Approve minimum quantities, price-list rules, quote validity, payment terms, freight treatment, returns, claims and cancellation language.
- Confirm the monitored trade inbox and response-time commitment.
- Decide whether approved trade accounts require authentication, account-specific price lists or downloadable quote documents in a later phase.
- Define the staff handoff from an accepted quote into invoicing, inventory allocation and fulfilment.
- Approve accurate, clean photography for remaining flagged products and complete the catalogue naming/content audit.

## Product photography

Use `data/missing-product-images.csv` as the acquisition list. Put approved supplier/manufacturer packshots or Aurum Privée-owned photographs in `product-image-intake`, named by SKU or barcode, then run:

```bash
npm run images:check
npm run images:import
```

Review `data/product-image-import-report.json` and the rendered catalogue before publishing. A resolving image URL is not, by itself, visual approval.

## Legacy commerce rollback

Legacy commerce code remains in the repository for a separately approved, change-controlled rollback. Restoring it would require a new business decision, reviewed public pricing and policies, complete environment configuration, migration verification, checkout and payment acceptance testing, and an explicit production approval. Do not mix a legacy checkout authority with the B2B RFQ release.
