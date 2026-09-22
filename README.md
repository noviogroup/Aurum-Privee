# Aurum Privée storefront

An original premium fragrance storefront built with Next.js and deployed on Netlify. Wix owns the active production catalogue and hosted-checkout path, the storefront retains its reviewed Loyverse-derived SKU identity, and Netlify Blobs provides private site storage without a separate database project.

## Wix Headless commerce cutover

The client-admin and Bahamas-payment architecture is documented in [`docs/adr/ADR-003-wix-headless-commerce.md`](./docs/adr/ADR-003-wix-headless-commerce.md). The original controlled pilot sequence remains in [`docs/WIX-HEADLESS-PILOT.md`](./docs/WIX-HEADLESS-PILOT.md), the current live-dashboard state is recorded in [`docs/WIX-SETUP-STATUS.md`](./docs/WIX-SETUP-STATUS.md), and the client-facing handover is in [`docs/CLIENT-HANDOVER.md`](./docs/CLIENT-HANDOVER.md).

The complete 733-SKU Wix import and hosted-checkout adapter are prepared. Wix is already the production catalogue provider and server-side order verification has passed against the protected preview runtime. Checkout remains fail-closed until fulfillment rules are approved, controlled orders pass, and both checkout launch controls are explicitly enabled. The Supabase, Stripe and direct Loyverse implementation is retained only as a deliberate rollback path.

## What is implemented

- Responsive homepage, catalog, scent-family filtering and product detail pages
- Persistent shopping bag with quantity controls and Wix-managed availability before hosted checkout
- Wix-hosted checkout with a complete 733-SKU mapping, fail-closed launch controls and Wix-managed payment and fulfillment choices
- A retained legacy Stripe adapter with Nassau pickup, New Providence delivery and Loyverse-matched added/included tax handling for an eligible Stripe merchant
- A retained legacy path with verified payment webhooks, durable order records, Resend confirmation email and merchant notification
- Server-verified Wix order returns that clear the purchased bag only after an approved order is retrieved
- Loyverse item and inventory importer, authenticated item/inventory webhooks, customer mapping, idempotent sale receipts and automatic full-refund receipts
- Zero-provisioning Netlify Blobs storage for paid orders, webhook state, inquiries, newsletter consent and rate limits
- Newsletter capture, SEO metadata, reduced-motion support and keyboard-visible focus states
- Private saved-fragrance shortlist with accessible controls, validated device storage and cross-tab synchronization
- Confirmed-opt-in newsletter consent, durable abuse limits and replay-safe provider event claims
- Empty, error and loading feedback for the key purchase flows
- Stored, abuse-protected client-care inquiries with private merchant notifications and staff-console reply routing through Netlify Blobs
- Provider-aware account and operations states that keep Wix orders, customer records, catalogue edits and images under one active authority
- Retained legacy Stripe retries plus provider-idempotent Loyverse receipts and Resend messages

The local catalog contains the connected merchant's current in-stock fragrance assortment. Editorial descriptions, fragrance families, notes, policies and products using the branded fallback image remain provisional and require approval before launch.

## Local setup

1. Install Node.js 22.22.2 (the version pinned in `.nvmrc`) or a newer Node.js 22 release.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add available credentials.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The site reads `data/loyverse-products.json`; the small hand-authored demo catalog is used only when that snapshot is absent. Netlify automatically provisions site-scoped Blobs storage when server routes first write commerce data. Checkout additionally requires `NEXT_PUBLIC_CHECKOUT_ENABLED=true`; leave it false until the full production acceptance checklist passes.

Run `npm run sync:loyverse:local` with the Loyverse token and store ID in `.env.local`. This writes an in-stock fragrance snapshot to `data/loyverse-products.json` and an acquisition worksheet for missing photography to `data/missing-product-images.csv`. Commit and deploy an approved snapshot after reviewing catalog and image changes.

The current catalog contains 733 available fixed-price fragrance variants. The 658 acceptable Loyverse product images are mirrored into standardized local WebP assets so storefront rendering does not depend on Loyverse's image endpoint. One additional Loyverse image was rejected because it is only 80×80 pixels, leaving 75 products on an original bottle-free Aurum Privée art panel that cannot be mistaken for the actual merchandise. Add approved photography through the repository intake workflow; later local catalog refreshes preserve those curated files.

## Verification

Run `npx playwright install chromium webkit` once on a new workstation, then use `npm run verify` for the complete local release suite: lint, TypeScript, unit tests, production build, and Chromium/WebKit browser journeys at 1440×900 and 390×844, plus a 430×932 Chromium breakpoint. The browser suite covers the primary homepage action, responsive overflow, catalog search, saved fragrances, bag persistence, closed-checkout safety, keyboard focus restoration, public support and policy routes, redirects, private-page indexing rules, contact and newsletter submissions, retired-provider isolation, and automated WCAG A/AA scans. When `PLAYWRIGHT_BASE_URL` targets a hosted preview, it also verifies the Netlify security policy. Netlify runs the non-browser `npm run verify:build` gate before it can publish a deploy. GitHub Actions runs PostgreSQL 16 migration invariants, the runtime dependency audit, and the complete Wix-mode release suite on pushes and pull requests.

Run the same non-destructive journeys against a deployed preview or production origin with `PLAYWRIGHT_BASE_URL=https://example.netlify.app npx playwright test`. The external mode does not start a local server and still leaves checkout closed unless that deployment's launch controls are explicitly enabled.

Run `npm run preflight:production` separately in the deployment environment. This live gate intentionally fails until the real business credentials, notification inbox, public domain, fulfillment configuration, and both checkout launch switches have been approved.

Run `npm run images:mirror-loyverse` after a source catalog refresh to download new or changed Loyverse imagery. The command is resumable, validates dimensions, pins each source URL and SHA-256 hash in `data/loyverse-image-manifest.json`, and records rejected sources instead of upscaling unusable files.

Approved product images can also be processed locally without editing code. Put files named by SKU, barcode or Loyverse variant ID into `product-image-intake`, run `npm run images:check`, then `npm run images:import`. The importer requires at least 800×800 pixels, writes normalized WebP assets, removes completed products from the acquisition worksheet, and records durable source/audit metadata in `data/curated-product-images.json` plus `data/product-image-import-report.json`. Later local Loyverse refreshes preserve those approved photographs.

## Connection order

1. Replace the inherited Wix fulfillment regions with approved pickup and delivery rules.
2. Keep the site-restricted `WIX_API_KEY` in encrypted Netlify production and deploy-preview settings. Its catalogue and order-verification access passed through the protected preview health probe on September 18, 2026.
3. Keep the verified, domain-restricted Resend credential and monitored merchant-notification address in encrypted Netlify production and deploy-preview settings.
4. Keep the independent rate-limit, sync, health-monitor and staff-session secrets and the owner-approved staff-console password in encrypted production and deploy-preview settings.
5. Use the passing deploy preview and external Playwright suite for owner review while checkout remains closed.
6. Complete controlled desktop and phone orders, including confirmation, cancellation/refund, notification and inventory checks.
7. Enable both checkout switches only after explicit acceptance.

The active sequence is in [`PRODUCTION-HANDOFF.md`](./PRODUCTION-HANDOFF.md). The complete Loyverse operator runbook remains in [`LOYVERSE-SETUP.md`](./LOYVERSE-SETUP.md) for an intentional legacy rollback.

## Staff operations console

The protected staff workspace is available at `/operations`. It uses an HttpOnly, same-site signed session; browser code never receives provider credentials or the session-signing secret.

Configure two server-only values before use: `OPERATIONS_PASSWORD`, a unique password of at least 12 characters, and `OPERATIONS_SESSION_SECRET`, an independent random value of at least 32 characters. Production login attempts use the durable Netlify Blobs limiter. While Wix owns commerce, the order and customer areas direct staff to Wix, the catalogue and image areas are read-only, and authenticated legacy mutation routes return a conflict before touching legacy state. Retired provider webhooks and scheduled recovery routes acknowledge a successful no-op so stale callbacks cannot write data or create retry storms. Switching to the legacy provider deliberately restores the retained Netlify Blobs or Supabase order workflow.

Product images are handled through the versioned repository intake and normalization pipeline. Only Aurum Privée-owned or supplier/manufacturer images licensed for retail use should be added.

The protected Integrations workspace at `/operations/integrations` checks configuration without exposing secret values. Set `LOYVERSE_CREDENTIALS_ROTATED=true` only after every token used during development or shared outside the production secret store has been replaced.

Run `npm run preflight:production` in the fully configured deployment environment for the same checks as a deterministic release gate. It prints sanitized statuses and requirements, never credential values, and exits nonzero unless every service is live-verified as ready and the checkout launch switch is open.

The public contact page stores validated inquiries in private Netlify Blobs before attempting a merchant notification. The protected client-care workspace can read, classify, reply to and close those records without Supabase. Messages are rate-limited, never exposed to public routes, and receive a non-sequential client reference. Configure `STORE_NOTIFICATION_EMAIL` and Resend before enabling the form in production.

Customer account sign-in is intentionally deferred while Wix guest/member ownership is unresolved. In Wix mode `/account` presents saved-fragrance and client-care paths instead of offering a Supabase sign-in that would not contain Wix order history.

## Background operations

Stripe retries failed signed webhook deliveries. Replayed events are checked against durable Netlify event records, while Loyverse order lookup and Resend idempotency keys make downstream retries safe. In Wix mode, the retired Stripe and Loyverse webhooks return an acknowledged no-op before reading provider secrets or request bodies, and the legacy recovery workers do the same after authenticating scheduled requests. Public `/api/health` remains a cheap liveness check; its protected detail checks the active provider, including Wix catalog reachability and mapping coverage.

## Important launch decisions

- Confirm whether prices are BSD or USD. BSD is configured now.
- Replace the inherited Ghana and worldwide free-shipping rules with the exact approved markets, fees and service levels.
- Confirm the physical pickup addresses, opening hours, order cutoffs and contact details.
- Approve the manual-payment or bank-transfer instructions and the monitored order inbox.
- Confirm tax treatment in Wix for products and every fulfillment method.
- Approve return, privacy and terms language with the business owner and legal adviser.
- Decide whether a future Wix-to-Loyverse automation is required. Until it is separately accepted, Wix remains the online order and inventory authority and the two systems must not be treated as automatically synchronized.

## Generated visual assets

The three launch-direction images in `public/images` were generated specifically for this Aurum Privée concept. They contain no third-party labels or copied theme artwork. Replace them with real inventory photography before launch where possible.
