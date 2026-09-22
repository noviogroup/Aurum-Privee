# Aurum Privée production handoff

This handoff describes the active Wix Headless release path. The retained Supabase, Stripe and direct Loyverse checkout implementation is a rollback path, not a prerequisite for the Wix launch.

Do not place credentials in chat, tickets or this repository. Enter them directly in Netlify's encrypted environment settings or share them through an approved password manager.

## Current release state

- The production catalogue provider is Wix and all 733 approved SKUs are mapped.
- The public checkout remains deliberately closed through both `NEXT_PUBLIC_CHECKOUT_ENABLED=false` and `WIX_CHECKOUT_ENABLED=false`.
- The current public deployment was published on September 13, 2026 and predates the hardened release candidate. Deploy preview `6aadd3c1b7561c14dcf6c188` passed the complete Chromium and WebKit hosted browser gate on September 18, including malformed-catalogue recovery, bag preservation, cancellation-safe pagination, reduced-motion behavior, minimum primary and menu touch targets, the branded 404 recovery path, resilient customer-form and checkout handoffs, and the route-layer frame, referrer, permissions and Content Security Policy headers. Production has not been changed.
- `docs/WIX-SETUP-STATUS.md` is the source of truth for the live Wix account and remaining business configuration.
- `LOYVERSE-SETUP.md` applies only if the legacy provider is deliberately restored.

## Owner decisions still required

- Replace the inherited Ghana and worldwide free-shipping rules with approved fulfillment rules.
- Confirm the complete Nassau pickup address, contact details, hours and order cutoff; decide whether Harbour Island pickup will be offered and, if so, approve the same details there.
- Confirm delivery areas, fees, thresholds, timing and tax treatment for every market that will be offered.
- Approve the existing cash-on-pickup instruction, or provide a separately reviewed payment method through a secure channel.
- Confirm that `noviogroup@gmail.com` is actively monitored for Netlify notifications, verify the Wix merchant-order recipient during a controlled order, and approve returns, cancellations, refunds, privacy and terms language.
- Approve direct correction of the three reviewed Wix catalogue records for Baccarat Rouge 540 and the 1.7/3.4 oz Phantom editions. The storefront is corrected through an explicit source-backed layer, but Wix order/admin display names remain unchanged until those records are reviewed and updated. Do not bulk-import the regenerated 733-SKU CSV without a separate catalogue-change review.
- Approve removal of the nine isolated Wix placeholder products if they should be deleted.

## Production access and configuration

### Netlify and domain

- Netlify site access and DNS access for `aurumprivee.com`
- `NEXT_PUBLIC_SITE_URL=https://aurumprivee.com`
- Independent high-entropy values for `RATE_LIMIT_SECRET`, `SYNC_SECRET`, `HEALTH_MONITOR_SECRET` and `OPERATIONS_SESSION_SECRET` are stored as non-readable Netlify secrets for production and deploy previews.
- The deploy-preview context mirrors the production Wix and Resend runtime configuration while both checkout controls remain false.
- The validated staff `OPERATIONS_PASSWORD` is stored as a non-readable Netlify secret for production and deploy previews. It is distinct from the machine secrets and will take effect on the next deployment.

### Wix

- `COMMERCE_PROVIDER=wix`
- The existing `NEXT_PUBLIC_WIX_CLIENT_ID`, `WIX_SITE_ID`, `WIX_STOREFRONT_ORIGIN`, `WIX_CATALOG_VERSION=v3` and `WIX_EXPECTED_SKU_COUNT=733`
- The server-only `WIX_API_KEY` generated on September 17, 2026 is restricted to the Aurum Privée site and Wix eCommerce. It is stored as a non-readable Netlify secret for production and deploy previews. A protected preview-runtime probe on September 18 returned `status: ok`, `catalog: ok`, `orderVerification: ok` and all 733 mapped variants. No wider Wix permission is required.
- Both checkout switches kept false until the acceptance sequence below passes
- The live Wix audit on September 18 confirmed: Business Info has no address/email/phone; Ghana and worldwide free shipping remain active; no tax location exists; all checkout policies and the policy-agreement/contact links are disabled; and manual cash payment is active. The eligible-order customer email and merchant notification automations are active but both show zero triggers and `Never` for the last run. The merchant automation also has unpublished changes, which must not be published until its recipient and content are approved.

### Email and client care

- `aurumprivee.com` is verified in Resend and `RESEND_FROM_EMAIL` is configured as `Aurum Privée <orders@aurumprivee.com>`.
- Resend contained two domain-scoped Sending-access Aurum Privée keys with no recorded activity during the September 18 dashboard audit. Netlify stores `RESEND_API_KEY` as a non-readable secret, so the dashboard alone cannot identify it. A read-only live check on preview `6aadb9a9329918fc5595117b` confirmed that the deployed runtime accepts a domain-restricted Sending key for the verified `aurumprivee.com` domain. Controlled acceptance messages are still required to prove delivery.
- `STORE_NOTIFICATION_EMAIL=noviogroup@gmail.com` is configured for production and deploy previews and will take effect on the next deployment. Confirm the owner actively monitors this inbox before enabling checkout.

Wix owns standard order messages. Resend remains responsible for contact, newsletter and bespoke internal messages. Do not enable overlapping order notifications.

Remote Resend preflights now require a domain-scoped Sending-access key. A full-access key can still be used deliberately for local development, but it cannot pass in production, deploy-preview or branch-deploy contexts. `netlify dev:exec` loads `.env.local` ahead of matching project variables in this repository, so a result from that command is not evidence of the secret used by an actual deploy.

## Local release evidence

The hardened release candidate passed the following checks through September 18, 2026:

- Lint, TypeScript, the production build and all 157 unit/contract tests, including a static 733-SKU catalogue/map integrity contract, an implausible-ounce-size guard, customer-request timeout, lifecycle cancellation and response-format contracts, catalogue payload validation, credential-free HTTPS checkout redirects, and a least-privilege Resend deployment guard.
- All 65 locally applicable Playwright journeys across desktop and mobile Chromium and WebKit; the five hosted-header checks were skipped locally by design and passed on the deploy preview.
- All 70 hosted Playwright checks on deploy preview `6aadd3c1b7561c14dcf6c188`, covering desktop Chromium, desktop WebKit, 390-pixel Chromium and WebKit, and a 430-pixel Chromium breakpoint. The hosted checks include WCAG A/AA automation, security headers, public health liveness, redirects, malformed-catalogue recovery with bag preservation, duplicate-safe form recovery workflows, responsive-image selection, corrected retail facts, branded 404 recovery and closed-checkout behavior. The complete run passed without retries.
- Netlify Blobs webhook claims, fallback rate limits and inquiry updates use conditional writes so concurrent requests cannot silently double-process or overwrite each other.
- The Wix handoff contract rejects unmapped products, unsafe quantities and noncanonical callback origins; abandoned checkouts return to a clear bag-preserved state.
- Checkout launch requests time out after 15 seconds, abort on navigation, reject rapid duplicates before React can rerender and accept only absolute credential-free HTTPS handoff URLs. Network failures, malformed proxy responses and unsafe redirects recover without clearing the bag. Long catalogue and receipt text wraps without displacing amounts on narrow screens.
- Contact and private-list requests time out after 15 seconds, abort on navigation, reject malformed or non-JSON edge responses, preserve customer input for a safe retry and block rapid duplicate submissions before React can rerender the disabled state.
- Catalogue, header-search, saved-fragrance and cart-refresh requests share the same 15-second JSON response contract. They abort when their owning view closes or unmounts, reject malformed product records and impossible totals, prevent stale pagination from appending after a filter change, and preserve the locally saved bag when a gateway returns invalid data.
- Primary mobile commerce controls now keep a measured 44-pixel minimum target, including search, save, add-to-bag, related-product add, quantity and drawer controls. Every mobile fragrance-menu destination also measures at least 44 pixels high; account and saved are grouped near the top while search and bag retain the header action positions, preventing horizontal overflow without burying those paths. Cancelling a pending catalogue page clears its busy state immediately, and reduced-motion mode removes spatial movement while preserving short color and border feedback.
- Cart and search dialogs restore keyboard focus to their exact opening control in Chromium and Safari/WebKit. Local HTTP verification omits only the HTTPS-only CSP upgrade directive, while Netlify retains and verifies the complete production policy.
- All 14 PostgreSQL 16 migrations and their invariants.
- The production dependency audit with zero reported vulnerabilities, plus the offline Netlify production build.
- A full crawl of preview `6aadb663bef69899d754e717` verified all 735 sitemap URLs: every page returned 200 with a non-empty title and description, a canonical URL and exactly one H1. All 734 unique images referenced by those pages returned successful image responses. The three reachable but unapproved shipping/returns, privacy and terms pages are intentionally `noindex,follow` and excluded from the sitemap until merchant approval; no `noindex` page leaked into the sitemap.
- Structural checks across all 730 product pages: one H1, Product JSON-LD, a primary image and non-empty primary-image alt text on every page.
- A rendered desktop and mobile design audit after the accessibility polish across the homepage, catalogue, product, about, contact, saved, checkout and operations-login surfaces. Branded, responsive loading skeletons now preserve catalogue and product geometry; unexpected routes have an accessible editorial 404 with recovery paths; and page-level render failures offer retry and collection recovery actions. The only remaining detector advisories are intentional brand treatments or false positives from text over photography and fixed-height buttons.
- A final product-page polish pass preserved the established ivory/gold editorial system while stacking the related-products explanation under its heading. The same rendered pass found and corrected catalogue truth that structural tests missed: Baccarat Rouge 540 now renders as 2.4 oz Extrait de Parfum, Phantom's malformed `17 oz` value is corrected to 1.7 oz, and both Phantom records use the established Paco Rabanne spelling. The correction layer is keyed to the three reviewed source IDs, survives Wix display-name overlays, and records review evidence rather than changing general numeric parsing.
- Customer-facing hover treatments are capability-gated to fine-pointer devices so taps cannot leave product imagery or controls in a stuck hover state; saved-item and detail controls retain explicit touch press feedback.
- The Wix-backed homepage now uses a 60-second ISR window while catalogue APIs, product pages and checkout remain live. In repeated local mobile Lighthouse runs, performance scored 92–94 and Accessibility, Best Practices and SEO each scored 100; root response time fell from 3.18 seconds before ISR to 10–30 milliseconds after it. These are local lab measurements, not hosted guarantees.
- Two hosted mobile Lighthouse runs against preview `6aad4fee52c77d5bb2f1f3c9` scored 92–93 Performance, 100 Accessibility and 100 Best Practices, with 1.0–1.3-second FCP, 3.0–3.1-second LCP, 20–50-millisecond total blocking time and zero cumulative layout shift. The preview SEO score is intentionally reduced by Netlify's `X-Robots-Tag: noindex`; production SEO is verified separately through metadata, canonical and sitemap checks.
- Narrow screens receive dedicated sources for the hero, five collection tiles, two campaign stories and six featured-product cutouts while desktop keeps the full originals. The hosted mobile transfer fell from 1,090 KiB to 569 KiB and Lighthouse's estimated image-delivery waste fell from 725 KiB to 183 KiB, with no observed crop or layout change. Below-the-fold product images remain low priority and no longer preload duplicate desktop files.
- The shop editorial now selects a visually equivalent 800-pixel mobile source without preloading its desktop fallback. A cold 390-pixel hosted comparison reduced the shop transfer from 1,144,022 to 1,003,883 bytes (12.2%) and image transfer from 908,958 to 768,306 bytes; the browser downloaded only the 52,912-byte mobile editorial source.
- Public holding copy no longer promises an unconfigured Nassau pickup, delivery option or return window. Unapproved policy pages remain usable for client-care escalation but are excluded from search indexing until their final terms are supplied.

These checks prove the release candidate and hosted runtime, not fulfillment acceptance. Approved business rules, controlled orders and explicit owner approval remain in the sequence below.

## Deployment and acceptance order

1. Run `npm run verify`, `npm run test:migrations`, `npm audit --omit=dev --audit-level=high` and `netlify build --offline`. Use `--dry --offline` only to inspect the planned build stages; it does not execute them. GitHub Actions repeats the audit, all PostgreSQL 16 migration invariants and the complete Wix-mode browser suite on every push and pull request.
2. Confirm the configured Wix, Resend, notification inbox, staff password and independent machine secrets are available to the actual preview runtime. Keep both checkout switches false. Do not use `netlify dev:exec` as proof of the deployed Resend secret because local `.env.local` values take precedence there.
3. Publish a deploy preview. Run `PLAYWRIGHT_BASE_URL=https://DEPLOY-PREVIEW npm run verify:hosted` and confirm all Chromium and WebKit desktop and mobile checks pass. The guarded command refuses a missing or non-HTTPS URL so the Netlify-only checks cannot be silently skipped. Hosted runs require the deployed CSP, frame protection, referrer policy, HSTS, MIME-sniffing protection and a public health response that exposes liveness only. Preview `6aadd3c1b7561c14dcf6c188` passed all 70 checks without retries on September 18, 2026.
4. Confirm `/api/health` returns public liveness. Call its protected detail with `Authorization: Bearer $HEALTH_MONITOR_SECRET` and require `status: "ok"`; the Wix detail verifies catalogue reachability and mapping coverage. This passed on protected probe deploy `6aad33d996eaac29d09016c2` with `catalog: ok`, `orderVerification: ok` and 733/733 mapped variants; the deploy-only probe secret did not alter saved Netlify settings.
5. Run `npm run preflight:wix`, `npm run preflight:email` and `npm run preflight:production` inside the actual deployed or CI environment. The email preflight must confirm that the runtime key is domain-scoped and Sending-only. Production preflight must remain nonzero until every launch requirement is actually satisfied.
6. In Wix, replace the inherited shipping rules and configure only the approved pickup/delivery methods. Approve the tax, currency and manual-payment treatment, then publish the approved checkout policies, agreement control and contact link.
7. After approving and publishing the pending merchant-automation change, execute one controlled order from a 390-pixel phone viewport and one from desktop. Verify the SKU, quantity, amount, customer, fulfillment method, Wix order, customer message, merchant message, cancellation/refund behavior and inventory result. Confirm both automations move beyond their current zero-trigger/never-run state. Use an approved low-value live procedure when no sandbox exists.
8. Verify that a forged, malformed, pending or rejected Wix return cannot display a confirmed order or clear the bag. Verify that an approved Wix order does both.
9. Confirm the Netlify health monitor has a successful scheduled run. The four retained legacy recovery schedules should log a successful Wix-mode no-op; they become active only after an intentional rollback to the legacy provider.
10. Obtain explicit owner approval. Set `WIX_CHECKOUT_ENABLED=true` and `NEXT_PUBLIC_CHECKOUT_ENABLED=true` in one controlled deploy, rerun all three preflights and rerun the external browser suite.
11. Monitor the first trading period in Wix, Netlify function logs, the monitored inbox, and the protected client-care and integration workspaces. Manage active orders and customer records in Wix. If acceptance fails, turn both checkout switches off immediately.

## Product photography

The approved snapshot has 658 acceptable source images mirrored locally and 75 bottle-free Aurum Privée editorial placeholders awaiting approved photography. Use `data/missing-product-images.csv` as the acquisition list. Put approved supplier/manufacturer packshots or Aurum Privée-owned photographs in `product-image-intake`, named by SKU or barcode, then run:

```bash
npm run images:check
npm run images:import
```

Review `data/product-image-import-report.json` and the rendered catalogue before publishing. Routine Wix-managed media changes appear in the storefront without a design rebuild.

## Legacy rollback

The Supabase, Stripe, direct Loyverse receipt and recovery implementation remains in the repository for a deliberate rollback. While `COMMERCE_PROVIDER=wix`, retired Stripe and Loyverse callbacks are acknowledged without processing, scheduled legacy routes return a successful no-op after authentication, and manual legacy setup, order and fulfillment routes fail closed. Restoring the old stack is a change-controlled operation: set `COMMERCE_PROVIDER=legacy`, configure the full legacy environment, apply all migrations, run `npm run test:migrations`, execute every test in `LOYVERSE-SETUP.md`, and verify all recovery schedules before accepting an order. Do not mix the Wix and legacy order authorities in one live release.
