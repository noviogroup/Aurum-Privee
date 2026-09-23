# Aurum Privée trade catalogue

Aurum Privée is a responsive B2B fragrance catalogue and request-for-quote application built with Next.js and deployed on Netlify. Wix supplies the private catalogue data, while Netlify Blobs stores quote requests, contact enquiries, newsletter consent and abuse-control state.

The production site does not publish prices, expose inventory, accept payments or create online orders. Buyers build a quantity-aware quote list and submit it for private commercial review.

## Active product model

- Public catalogue and product pages for designer, niche and Arabian fragrance
- Device-local quote list with quantities and buyer notes
- Trade enquiry form for retailers, distributors, hospitality, corporate and other professional buyers
- Server-side product revalidation before a request is accepted
- Durable `APQ-…` quote references with customer and merchant email notifications
- Protected quote workspace at `/operations/quotes`
- Quote states: `new`, `reviewing`, `needs_info`, `quoted` and `closed`
- No anonymous price, stock, tax, SKU, barcode or provider-identifier fields
- Closed checkout: `/checkout` redirects to `/shop`

The previous cart, checkout, paid-order and payment-provider implementation remains dormant legacy code. It is not part of the active B2B release and must not be re-enabled without a separately approved architecture and acceptance cycle.

## Quick start

1. Install the Node version pinned in `.nvmrc` or a compatible newer release.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure only the services needed for the task.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Production catalogue reads require the Wix configuration documented in [PRODUCTION-HANDOFF.md](./PRODUCTION-HANDOFF.md). Quote delivery requires a verified Resend sender, a monitored merchant recipient and Netlify Blobs access.

## Public RFQ flow

```text
Wix catalogue
    → server-side catalogue normalization
    → privacy-safe public product response
    → buyer quote list in local storage
    → POST /api/quote-requests
    → server-side catalogue revalidation
    → atomic Netlify Blobs record
    → customer acknowledgement + merchant notification
    → protected staff review
```

Submitting a quote request is not an order, reservation, binding quotation or commercial acceptance. Pricing, minimum quantities, availability, lead times, freight, payment and other terms are handled privately.

## Security and privacy

- Strict, bounded RFQ validation with a maximum of 20 unique products
- Quantity range of 1–999 per line and bounded buyer notes
- Same-origin enforcement on public submissions and staff mutations
- Per-client and global durable rate limits
- Honeypot filtering for automated submissions
- Server-authoritative product lookup; browser-supplied commercial facts are never trusted
- Atomic submission UUID idempotency and provider email idempotency keys
- Signed HttpOnly staff sessions and authenticated operations APIs
- Public catalogue allowlisting rather than removal of selected private fields
- Quote list data remains on the buyer's device until submitted or cleared

## Verification

Run the complete local release gate:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

The gate runs lint, TypeScript, unit/contract tests, a production build, and Playwright journeys across desktop/mobile Chromium and WebKit. Hosted verification also checks the Netlify edge security policy:

```bash
PLAYWRIGHT_BASE_URL=https://your-deploy.example npm run verify:hosted
```

The production release at commit `600b57e` passed 168 unit/contract tests, 70 locally applicable browser journeys and all 75 hosted browser/security checks.

## Operations

The protected staff workspace is available at `/operations`. Configure:

- `OPERATIONS_PASSWORD`: unique value of at least 12 characters
- `OPERATIONS_SESSION_SECRET`: independent value of at least 32 characters
- `RATE_LIMIT_SECRET`: independent request-fingerprint secret
- `RESEND_API_KEY`: domain-scoped Sending key
- `RESEND_FROM_EMAIL`: verified Aurum Privée sender
- `STORE_NOTIFICATION_EMAIL`: actively monitored trade inbox

Staff can inspect quote lines, buyer notes and contact details, then update the workflow state. Formal quote authoring, PDFs, acceptance, invoices and account-specific pricing are later-phase capabilities.

## Catalogue photography

Use `data/missing-product-images.csv` as the acquisition list. Place approved supplier/manufacturer packshots or Aurum Privée-owned photographs in `product-image-intake`, named by SKU or barcode, then run:

```bash
npm run images:check
npm run images:import
```

Review `data/product-image-import-report.json` and the rendered catalogue before publishing.

## Documentation map

- [PRODUCTION-HANDOFF.md](./PRODUCTION-HANDOFF.md): active release and operational checklist
- [docs/B2B-RFQ-SPEC.md](./docs/B2B-RFQ-SPEC.md): product, workflow and data contract
- [docs/CLIENT-HANDOVER.md](./docs/CLIENT-HANDOVER.md): client-facing ownership and decisions
- [docs/adr/ADR-004-b2b-rfq.md](./docs/adr/ADR-004-b2b-rfq.md): active architecture decision
- [docs/RESEND_SETUP.md](./docs/RESEND_SETUP.md): email configuration
- [LOYVERSE-SETUP.md](./LOYVERSE-SETUP.md): legacy rollback runbook only

Checkout-era Wix, payment and commerce ADR documents remain versioned for historical context. Each is marked as superseded and must not be used as the active launch plan.
