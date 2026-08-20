# Aurum Privée storefront

An original premium fragrance storefront built with Next.js. Local review uses a generated snapshot from the connected Loyverse account; production switches to Supabase-backed products with webhook and scheduled synchronization.

## What is implemented

- Responsive homepage, catalog, scent-family filtering and product detail pages
- Persistent shopping bag with quantity controls and atomic checkout inventory reservations
- Stripe-hosted Checkout Sessions with Nassau pickup, New Providence delivery and Loyverse-matched added/included tax handling, ready for an eligible Stripe merchant
- Verified Stripe webhook, durable order record, Resend confirmation email and merchant notification
- Server-verified paid-order receipt page, automatic purchased-bag clearing and idempotent ready/fulfilled/cancelled customer emails
- Loyverse item and inventory importer, authenticated item/inventory webhooks, customer mapping, idempotent sale receipts and automatic full-refund receipts
- Supabase commerce schema with locked-down tables
- Newsletter capture, SEO metadata, reduced-motion support and keyboard-visible focus states
- Private saved-fragrance shortlist with accessible controls, validated device storage and cross-tab synchronization
- Confirmed-opt-in newsletter consent, durable abuse limits and replay-safe provider event claims
- Empty, error and loading feedback for the key purchase flows
- Stored, abuse-protected client-care inquiries with private merchant notifications and reply routing
- Scheduled reservation cleanup, order-sync and transactional-email retries, nightly Loyverse reconciliation and hourly operational health checks on Netlify

The local catalog contains the connected merchant's current in-stock fragrance assortment. Editorial descriptions, fragrance families, notes, policies and products using the branded fallback image remain provisional and require approval before launch.

## Local setup

1. Install Node.js 20 LTS or newer for the smoothest local experience.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add available credentials.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

When Supabase is not configured, the visual site reads `data/loyverse-products.json`; the small hand-authored demo catalog is used only when that snapshot is absent. Once Supabase is connected, an empty or failed live catalog never falls back to local or demo products. Checkout, email, database storage and production synchronization fail clearly until their keys are configured. Checkout additionally requires `NEXT_PUBLIC_CHECKOUT_ENABLED=true`; leave it false until the full production acceptance checklist passes.

For local review before Supabase is available, run `npm run sync:loyverse:local` with the Loyverse token and store ID in `.env.local`. This writes an in-stock fragrance snapshot to `data/loyverse-products.json` and an acquisition worksheet for missing photography to `data/missing-product-images.csv`. Production should use the Supabase sync and webhooks described below.

The 12 August 2026 snapshot contains 734 available fixed-price fragrance variants. The 659 acceptable Loyverse product images are mirrored into local WebP assets so storefront rendering does not depend on Loyverse's image endpoint. One additional Loyverse image was rejected because it is only 80×80 pixels, leaving 75 products on an original bottle-free Aurum Privée art panel that cannot be mistaken for the actual merchandise. Upload approved photography to Loyverse or set a curated `image_url` in Supabase; later catalog syncs preserve curated imagery.

Run `npm run images:mirror-loyverse` after a source catalog refresh to download new or changed Loyverse imagery. The command is resumable, validates dimensions, pins each source URL and SHA-256 hash in `data/loyverse-image-manifest.json`, and records rejected sources instead of upscaling unusable files.

Approved product images can also be processed locally without editing code. Put files named by SKU, barcode or Loyverse variant ID into `product-image-intake`, run `npm run images:check`, then `npm run images:import`. The importer requires at least 800×800 pixels, writes normalized WebP assets, removes completed products from the acquisition worksheet, and records durable source/audit metadata in `data/curated-product-images.json` plus `data/product-image-import-report.json`. Later local Loyverse refreshes preserve those approved photographs.

## Connection order

1. Create the Supabase project and run all SQL files in `supabase/migrations` in timestamp order. `npm run test:migrations` validates the chain and core reservation invariants on a disposable PostgreSQL 16 database.
2. Add the Supabase URL and service-role key to the host environment.
3. Create a Loyverse personal access token and store it only in encrypted server environment settings. Loyverse personal tokens have unlimited API access; use a registered OAuth app instead if scoped access is required.
4. Add the Loyverse store ID, online payment type ID and a fixed-price delivery-item variant ID.
5. Call `GET /api/setup/loyverse` with `Authorization: Bearer $SYNC_SECRET` to validate the connection.
6. Call `POST /api/setup/loyverse` with the same authorization to register authenticated `inventory_levels.update` and `items.update` webhooks.
7. Call `POST /api/sync/loyverse` to perform the initial full catalog sync.
8. Add payment-provider keys, create the payment webhook and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` and `charge.refunded`.
9. Add Resend, verify the sending domain and set the sender and merchant-notification addresses.
10. Replace sample imagery and curate product scent metadata in Supabase.

The complete Loyverse operator runbook, command examples and credential checklist are in [`LOYVERSE-SETUP.md`](./LOYVERSE-SETUP.md).

## Staff operations console

The protected order workspace is available at `/operations`. It uses an HttpOnly, same-site signed session; browser code never receives the Supabase service key, Loyverse token or sync bearer secret.

Configure two server-only values before use: `OPERATIONS_PASSWORD`, a unique password of at least 12 characters, and `OPERATIONS_SESSION_SECRET`, an independent random value of at least 32 characters. The console reads live orders from Supabase and supports search, attention filtering, order inspection, and confirmed transitions to ready, fulfilled or cancelled. Customer emails use the existing Resend fulfillment workflow. Production login attempts require the durable Supabase rate limiter.

The Product Images workspace is available at `/operations/images`. Migration `202608120009_product_image_intake.sql` creates an audit table, atomic publishing function and hosted-Supabase Storage bucket named `product-images`. Uploads are server-validated, normalized to WebP, published to the storefront and preserved as curated assets during later Loyverse catalog syncs. Only Aurum Privée-owned or supplier/manufacturer images licensed for retail use should be uploaded.

The protected Integrations workspace at `/operations/integrations` is the launch-readiness command center. It checks configuration without exposing secret values and can verify the Loyverse merchant/store/payment/delivery/webhook setup, Supabase database and image bucket, payment API, Resend sending domain, public HTTPS origin and staff security controls. Set `LOYVERSE_CREDENTIALS_ROTATED=true` only after every token used during development or shared outside the production secret store has been replaced.

Run `npm run preflight:production` in the fully configured deployment environment for the same checks as a deterministic release gate. It prints sanitized statuses and requirements, never credential values, and exits nonzero unless every service is live-verified as ready and the checkout launch switch is open.

The protected Catalog workspace at `/operations/catalog` separates retail truth from storefront merchandising. Loyverse continues to own price, stock, tax, SKU, barcode and sale availability. Aurum Privée staff can safely curate descriptions, fragrance family, top/heart/base notes, featured and new-arrival placement, storefront visibility and sort order. Every publish is validated and written to `product_curation_events`; later Loyverse syncs preserve those editorial fields.

The protected Customers workspace at `/operations/customers` groups orders by normalized customer email and shows order count, lifetime spend, latest activity, newsletter consent and Loyverse linkage. Staff may store audited VIP status, preferred fragrance families and private clienteling notes. Notes never sync to Loyverse, and newsletter status cannot be changed from the staff profile because consent remains subscriber-controlled.

The public contact page stores validated inquiries through migration `202608120012_contact_inquiries.sql` before attempting a merchant notification. Messages are rate-limited, never exposed to public database roles, and receive a non-sequential client reference. Configure `STORE_NOTIFICATION_EMAIL` and Resend before enabling the form in production.

The protected Client care workspace at `/operations/inquiries` is the staff inbox for those messages. Staff can filter and search, mark work in progress, send idempotent Resend replies that are recorded to the private conversation, and close resolved inquiries.

## Background operations

`netlify.toml` schedules five production jobs: expired checkout reservations every 5 minutes, failed transactional-email delivery every 10 minutes, failed/pending Loyverse order synchronization every 15 minutes, a full catalog reconciliation at 05:17 UTC daily, and a health monitor at minute 7 of every hour. Loyverse sale and refund workers use atomic 15-minute claims, recover interrupted work through provider-side receipt lookup, and stop after eight attempts for staff review. Order confirmations, fulfillment updates and merchant inquiry notifications use durable claims, Resend idempotency keys and at most eight automatic attempts. Public `/api/health` is a cheap liveness check. A request bearing the independent `HEALTH_MONITOR_SECRET` receives detailed operational state and counts—including stuck and exhausted Loyverse work—never credentials or customer data.

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
