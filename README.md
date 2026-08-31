# Aurum Privée storefront

An original premium fragrance storefront built with Next.js and deployed on Netlify. Loyverse is the retail source of truth, the storefront ships a generated catalog snapshot, and Netlify Blobs provides durable commerce storage without a separate database project.

## What is implemented

- Responsive homepage, catalog, scent-family filtering and product detail pages
- Persistent shopping bag with quantity controls and a live Loyverse stock check before payment
- Stripe-hosted Checkout Sessions with Nassau pickup, New Providence delivery and Loyverse-matched added/included tax handling, ready for an eligible Stripe merchant
- Verified Stripe webhook, durable order record, Resend confirmation email and merchant notification
- Server-verified paid-order receipt page, automatic purchased-bag clearing and idempotent ready/fulfilled/cancelled customer emails
- Loyverse item and inventory importer, authenticated item/inventory webhooks, customer mapping, idempotent sale receipts and automatic full-refund receipts
- Zero-provisioning Netlify Blobs storage for paid orders, webhook state, inquiries, newsletter consent and rate limits
- Newsletter capture, SEO metadata, reduced-motion support and keyboard-visible focus states
- Private saved-fragrance shortlist with accessible controls, validated device storage and cross-tab synchronization
- Confirmed-opt-in newsletter consent, durable abuse limits and replay-safe provider event claims
- Empty, error and loading feedback for the key purchase flows
- Stored, abuse-protected client-care inquiries with private merchant notifications and reply routing
- Stripe webhook retries plus provider-idempotent Loyverse receipts and Resend messages

The local catalog contains the connected merchant's current in-stock fragrance assortment. Editorial descriptions, fragrance families, notes, policies and products using the branded fallback image remain provisional and require approval before launch.

## Local setup

1. Install Node.js 20 LTS or newer for the smoothest local experience.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add available credentials.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The site reads `data/loyverse-products.json`; the small hand-authored demo catalog is used only when that snapshot is absent. Netlify automatically provisions site-scoped Blobs storage when server routes first write commerce data. Checkout additionally requires `NEXT_PUBLIC_CHECKOUT_ENABLED=true`; leave it false until the full production acceptance checklist passes.

Run `npm run sync:loyverse:local` with the Loyverse token and store ID in `.env.local`. This writes an in-stock fragrance snapshot to `data/loyverse-products.json` and an acquisition worksheet for missing photography to `data/missing-product-images.csv`. Commit and deploy an approved snapshot after reviewing catalog and image changes.

The catalog contains 734 available fixed-price fragrance variants. The 659 acceptable Loyverse product images are mirrored into standardized local WebP assets so storefront rendering does not depend on Loyverse's image endpoint. One additional Loyverse image was rejected because it is only 80×80 pixels, leaving 75 products on an original bottle-free Aurum Privée art panel that cannot be mistaken for the actual merchandise. Add approved photography through the repository intake workflow; later local catalog refreshes preserve those curated files.

Run `npm run images:mirror-loyverse` after a source catalog refresh to download new or changed Loyverse imagery. The command is resumable, validates dimensions, pins each source URL and SHA-256 hash in `data/loyverse-image-manifest.json`, and records rejected sources instead of upscaling unusable files.

Approved product images can also be processed locally without editing code. Put files named by SKU, barcode or Loyverse variant ID into `product-image-intake`, run `npm run images:check`, then `npm run images:import`. The importer requires at least 800×800 pixels, writes normalized WebP assets, removes completed products from the acquisition worksheet, and records durable source/audit metadata in `data/curated-product-images.json` plus `data/product-image-import-report.json`. Later local Loyverse refreshes preserve those approved photographs.

## Connection order

1. Create a Loyverse personal access token and store it only in encrypted Netlify environment settings.
2. Add the Loyverse store ID, online payment type ID and fixed-price delivery-item variant ID.
3. Run the local catalog and image pipeline, review the results, then deploy the approved snapshot.
4. Add payment-provider keys, create the payment webhook and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` and `charge.refunded`.
5. Add Resend, verify the sending domain and set the sender and merchant-notification addresses.
6. Add independent rate-limit and operations secrets.
7. Confirm test payments create a Netlify Blobs order, a Loyverse receipt and both confirmation emails before opening checkout.

The complete Loyverse operator runbook, command examples and credential checklist are in [`LOYVERSE-SETUP.md`](./LOYVERSE-SETUP.md).

## Staff operations console

The protected order workspace is available at `/operations`. It uses an HttpOnly, same-site signed session; browser code never receives the Loyverse token, payment secret or session-signing secret.

Configure two server-only values before use: `OPERATIONS_PASSWORD`, a unique password of at least 12 characters, and `OPERATIONS_SESSION_SECRET`, an independent random value of at least 32 characters. The console reads Netlify Blobs orders and supports search, attention filtering, order inspection, and confirmed transitions to ready, fulfilled or cancelled. Customer emails use the existing Resend fulfillment workflow. Production login attempts use the durable Netlify Blobs limiter.

Product images are handled through the versioned repository intake and normalization pipeline. Only Aurum Privée-owned or supplier/manufacturer images licensed for retail use should be added.

The protected Integrations workspace at `/operations/integrations` checks configuration without exposing secret values. Set `LOYVERSE_CREDENTIALS_ROTATED=true` only after every token used during development or shared outside the production secret store has been replaced.

Run `npm run preflight:production` in the fully configured deployment environment for the same checks as a deterministic release gate. It prints sanitized statuses and requirements, never credential values, and exits nonzero unless every service is live-verified as ready and the checkout launch switch is open.

The public contact page stores validated inquiries in private Netlify Blobs before attempting a merchant notification. Messages are rate-limited, never exposed to public routes, and receive a non-sequential client reference. Configure `STORE_NOTIFICATION_EMAIL` and Resend before enabling the form in production.

## Background operations

Stripe retries failed signed webhook deliveries. Replayed events are checked against durable Netlify event records, while Loyverse order lookup and Resend idempotency keys make downstream retries safe. Public `/api/health` remains a cheap liveness check.

## Important launch decisions

- Stripe currently does not onboard businesses registered in The Bahamas. Use this adapter only if Aurum Privée has an eligible Stripe entity and account. Otherwise, replace the isolated checkout and webhook routes with the approved Bahamian bank gateway. Bank of The Bahamas publicly offers BSD e-commerce settlement, and other local banks may offer their own gateway.
- Confirm whether prices are BSD or USD. BSD is configured now.
- Confirm New Providence delivery fee, courier, cutoff times and service area.
- Confirm the physical pickup address and opening hours.
- Decide whether the online order should create a completed Loyverse sale receipt immediately after Stripe payment or an open order for staff confirmation. Current code creates a sale receipt.
- Confirm that the live 10% added VAT and delivery-item tax selection are correct. The application calculates this from synced Loyverse tax data rather than depending on Stripe Tax.
- Approve return, privacy and terms language with the business owner and legal adviser.
- Decide if loyalty points should be shared between Loyverse and the online customer experience.

## Generated visual assets

The three launch-direction images in `public/images` were generated specifically for this Aurum Privée concept. They contain no third-party labels or copied theme artwork. Replace them with real inventory photography before launch where possible.
