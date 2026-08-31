# ADR-002: Database-free commerce on Netlify

- Status: Accepted
- Date: 2026-08-31
- Decider: Aurum Privée

## Context

Aurum Privée does not maintain a standalone application database. The store already runs on Netlify, while Loyverse owns product, price, stock, tax, customer and receipt records. Stripe handles payment and Resend handles transactional email. The website still needs durable order, webhook, inquiry and newsletter state without introducing a separate database account.

## Decision

Use the bundled, versioned Loyverse catalog for storefront reads and Netlify Blobs for small, private server-side commerce records.

- Loyverse remains the retail source of truth and receives a completed sale receipt after confirmed payment.
- Stripe remains the payment authority. Only signed paid webhook events create orders.
- Netlify Blobs stores paid-order records, Stripe event state, fulfillment state, contact inquiries, newsletter confirmation records and abuse-control windows.
- Resend sends customer and merchant notifications with provider idempotency keys.
- Product imagery remains versioned in the deployed site rather than stored in application data storage.
- Supabase is optional legacy infrastructure and is not required by the production baseline.

## Options considered

### Separate Supabase project

Strong relational transactions and advanced reporting, but it adds another account, schema, secret set and operating surface that the merchant does not currently have.

### Netlify Blobs with Loyverse as system of record

Zero-provisioning durable storage inside the existing host. It fits the store's expected order volume and keeps product, stock and receipts in Loyverse. It does not provide relational queries or atomic inventory reservations.

### Provider-only with no site persistence

The fewest components, but it cannot reliably support webhook replay, operations status, email retry visibility or customer-service lookup.

## Consequences

- No database project or database credentials are required.
- Checkout checks live Loyverse inventory immediately before creating the payment session, but there is no temporary inventory hold while the customer completes payment.
- Webhook and order operations rely on Netlify's site-scoped durable storage and strong read consistency.
- Advanced customer segmentation, multi-location allocation and high-volume reporting would justify revisiting a relational database later.
- Production checkout remains fail-closed until payment, email, Loyverse and security secrets are configured and verified.

## Required environment

- `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_STORE_ID`, payment type and delivery mappings
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the checkout launch switch
- `RESEND_API_KEY`, sender and merchant notification address
- `RATE_LIMIT_SECRET`, operations password and operations session secret

