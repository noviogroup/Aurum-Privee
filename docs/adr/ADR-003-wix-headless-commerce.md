# ADR-003: Wix Headless commerce with Loyverse inventory authority

- Status: Proposed
- Date: 2026-09-06
- Deciders: Aurum Privée owner and Novio Group implementation lead
- Supersedes on acceptance: ADR-002 for catalogue, checkout, orders, customers, fulfilment and transactional order email

## Context

Aurum Privée has a custom Next.js storefront hosted on Netlify and a live Loyverse POS. The checked-in catalogue snapshot currently contains 733 sellable variants: 717 quantity-tracked variants and 16 untracked variants. The current application also contains a custom Stripe checkout, Netlify Blobs order storage, Resend order emails, an operations console, and Stripe-to-Loyverse receipt/refund synchronization.

The client needs a non-technical dashboard for product presentation, photography, collections, customers, online orders and fulfilment. A Bahamas merchant also needs a supported payment provider. Wix currently documents PayPal, CXPay and Tilopay as available providers for The Bahamas, while Wix Headless supports an externally hosted frontend.

Running the existing commerce system and Wix as equal authorities would create conflicting products, prices, stock, customers, order states and email notifications. The architecture therefore needs explicit field ownership and one online order authority.

## Decision

Adopt Wix Headless as the **online commerce system of record** while retaining the custom Next.js frontend on Netlify. Keep Loyverse as the **physical POS and inventory authority**.

Do not activate the Wix provider globally until a 5–10 product pilot passes. The current provider remains the fail-safe default when `COMMERCE_PROVIDER` is absent or invalid.

### Responsibility and field ownership

| Capability or field | Authority | Notes |
|---|---|---|
| Storefront design, routes, SEO and advertising pages | Next.js on Netlify | Wix cannot edit the custom page structure with its visual editor. |
| Variant identity, SKU, barcode and store availability | Loyverse | `loyverseVariantId` is immutable and is the cross-system key. |
| Physical quantity on hand | Loyverse | Wix receives absolute inventory updates from Loyverse. Staff do not manually correct Wix stock. |
| Base price and VAT applicability | Loyverse | Wix mirrors the POS price and tax classification; Wix promotions may reduce the online selling price. |
| Display title, canonical brand, description, scent notes and SEO | Wix Stores | Client-editable merchandising data; sync must not overwrite it after initial creation. |
| Product photography and product/category media | Wix Stores Media | Client-managed and delivered to the custom storefront through Wix catalogue data. |
| Collections, badges and online visibility | Wix Stores | Used by the custom navigation, filters and featured sections. |
| Hero banners and editorial content | Wix CMS | Only explicitly modeled fields are editable; layout remains in code. |
| Visitor cart and checkout | Wix eCommerce | Presented through the existing custom UI, then Wix-hosted checkout. |
| Payment, online order and refund state | Wix eCommerce/payment provider | Only verified Wix order and transaction state may trigger POS accounting. |
| In-store receipt and physical stock decrement | Loyverse | A paid Wix order creates one idempotent Loyverse sale receipt. |
| Online fulfilment and customer order history | Wix | Client operates these in the Wix dashboard. |
| Standard order email | Wix Automations | Confirmation, refund, shipping, pickup-ready, cancellation and update messages. |
| Contact, newsletter and bespoke internal email | Resend | Retained only where Wix is not the owner of the workflow. |
| Integration event claims and reconciliation state | Netlify Blobs | Small durable records prevent duplicate receipts and support retries without adding a database. |

### Product identity

For newly created Wix products, use the Catalog V3 immutable `handle` as `loyverse-<item-id>` where practical. Keep the Loyverse variant UUID in a Wix product data-extension field or a dedicated private Wix CMS mapping collection. Preserve the native SKU and barcode as additional operator-visible checks.

Never join systems by product name, slug or image filename. Names and slugs are editorial fields and will change during catalogue cleanup.

### Catalogue synchronization

The integration is deliberately asymmetric:

1. A product and its purchasable variant are created in Loyverse first.
2. The catalogue worker creates or updates the matching Wix Catalog V3 product and inventory item.
3. Subsequent syncs update only Loyverse-owned fields: variant identity, SKU, barcode, base price, tax classification, availability and inventory.
4. Wix-owned merchandising fields are preserved after initial import.
5. The custom storefront reads public product, category, media, price and inventory data from Wix—not from a parallel Loyverse snapshot.

Wix Catalog V3 should be selected explicitly. Wix documents that a site uses either Catalog V1 or V3, and new development sites support V3. Catalog queries do not return full variant data, so the implementation must use product detail or Read-Only Variants endpoints when variant data is required. Read-Only Variants are eventually consistent and must not be the final stock check for checkout.

### Order and inventory flow

```text
Customer -> custom Next.js catalogue/cart -> Wix checkout ID
         -> Wix-hosted checkout -> payment provider
         -> Wix order approved webhook -> durable event claim
         -> fetch authoritative Wix order -> Loyverse sale receipt
         -> Loyverse stock change -> absolute Wix inventory reconciliation
```

- Wix automatically decrements tracked Wix inventory when a purchase completes.
- The order worker creates the corresponding Loyverse receipt using the Wix order ID/number as the external reference.
- The resulting Loyverse quantity becomes authoritative and is written back to Wix as an absolute value.
- Only Loyverse inventory events update Wix inventory. Wix inventory events never update Loyverse, preventing an event loop.
- Wix webhooks are signed JWTs. The handler verifies the signature, claims the Wix event ID, returns `200` quickly, and performs provider calls asynchronously.
- Webhooks can be duplicated, delayed and delivered out of order. Each consumer must refetch current provider state and use event/order idempotency keys.
- A nightly reconciliation compares every published Wix variant with Loyverse and repairs drift.

The 16 current untracked Loyverse variants remain unpublished in the pilot unless the owner explicitly approves an untracked/always-available policy. This avoids accepting an online order for unknown physical stock.

### Checkout and member flow

The existing custom bag remains visually unchanged. During the pilot it creates a Wix checkout and then a single-use redirect session. The customer completes payment on the branded Wix pages hostname, proposed as `checkout.aurumprivee.com`, and returns to an allowlisted Aurum Privée success URL.

Visitor and member cart operations use Wix OAuth. The client ID may be public; the client secret used to mint short-lived, site-scoped administrative tokens remains server-only. Customer accounts can use Wix Members, with Wix-managed login as the first implementation to reduce authentication risk.

### Refunds

For the pilot, support one verified full-refund path:

1. Staff initiates the refund in Wix.
2. A Wix order transaction update is received and verified.
3. The integration fetches the current Wix transaction state.
4. One corresponding Loyverse full refund is created if it does not already exist.

Partial refunds, exchanges and split tenders remain out of scope until their accounting treatment is approved. They must fail to a visible manual-reconciliation queue rather than silently adjusting stock.

### Transactional email

Wix Automations becomes responsible for standard order confirmation, refund, shipping, pickup-ready, cancellation and order-update messages. Resend must not send a second copy of those emails. Resend remains available for contact forms, newsletter consent and bespoke internal alerts.

### Security and configuration

- Store `WIX_CLIENT_SECRET`, administrative credentials and all provider secrets only in encrypted Netlify environment variables.
- `NEXT_PUBLIC_WIX_CLIENT_ID` is the only Wix credential intended for browser use.
- Verify Wix webhook JWT signatures with `WIX_WEBHOOK_PUBLIC_KEY` before parsing event data.
- Use least-privilege Wix permissions for product, inventory and order operations.
- Keep independent fail-closed switches for catalogue writes, order-to-Loyverse writes and checkout.
- Rotate every Loyverse and Resend credential previously exposed outside the production secret store before the pilot can access live data.
- Add exact Wix API, media and pages domains to the Content Security Policy only after the project hostnames are known. Do not add broad wildcard origins.

## Options considered

### Keep the current custom commerce backend

| Dimension | Assessment |
|---|---|
| Design control | Excellent |
| Client administration | Weak; requires maintaining a custom console |
| Bahamas payment fit | Weak until a supported gateway replaces Stripe |
| Engineering ownership | High ongoing burden |

The existing code provides useful integration patterns, but completing a merchant-grade catalogue, order, customer, email and refund console duplicates mature commerce-platform capabilities.

### Wix Headless with custom Netlify frontend — selected

| Dimension | Assessment |
|---|---|
| Design control | Excellent |
| Client administration | Strong |
| Bahamas payment fit | PayPal, CXPay and Tilopay are currently listed by Wix |
| Integration complexity | Medium; Wix–Loyverse synchronization is still custom |

This preserves the design investment while replacing most bespoke commerce administration.

### Full Wix-hosted storefront

| Dimension | Assessment |
|---|---|
| Design control | Lower than the custom frontend |
| Client administration | Strong |
| Implementation effort | Lower |
| Migration impact | High; discards or recreates the current experience |

This is not selected because the custom editorial and product experience is a core requirement.

## Consequences

- The custom Stripe checkout, custom paid-order store, custom fulfilment console and Resend order emails become retirement candidates after Wix cutover.
- The site still owns frontend uptime, performance, accessibility, SEO, cookie behavior and analytics consent.
- A checkout subdomain transition remains visible to customers, although it can be branded.
- Wix subscription and payment-provider costs become operating expenses.
- Wix and Loyverse cannot both be freely edited for stock and base price. Staff training and dashboard labels must reinforce ownership.
- The initial catalogue migration must include data cleanup, not merely copy the current abbreviations and generic descriptions.

## Rollback

Before full migration, `COMMERCE_PROVIDER=legacy` remains the default. Pilot routes and writes stay isolated behind the three Wix switches. If the pilot fails, disable all Wix switches and retain the existing storefront behavior without changing DNS or the public catalogue.

## Decision gates

ADR-003 can move from Proposed to Accepted only after:

1. The owner approves Loyverse as the physical inventory and base-price authority.
2. A Bahamas payment provider approves the merchant, currency and settlement arrangement.
3. The ten-product pilot passes the checklist in `docs/WIX-HEADLESS-PILOT.md`.
4. The owner approves the Wix plan and recurring provider costs.
5. Exposed Loyverse and Resend credentials are rotated.
6. Novio and the client approve the migration/rollback window.

## Primary references

- [Wix self-managed headless](https://dev.wix.com/docs/go-headless/self-managed-headless/about-self-managed-headless)
- [Wix Catalog V3](https://dev.wix.com/docs/api-reference/business-solutions/stores/catalog-v3/introduction)
- [Wix eCommerce Orders API](https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders/orders/introduction)
- [Wix-managed checkout redirect](https://dev.wix.com/docs/go-headless/develop-your-project/authentication/access-site-apis/redirect-to-wix-pages)
- [Wix Headless authentication](https://dev.wix.com/docs/go-headless/get-started/setup/authentication/about-authentication)
- [Wix webhook delivery and verification](https://dev.wix.com/docs/build-apps/develop-your-app/api-integrations/events-and-webhooks/about-webhooks)
- [Wix Stores customer emails](https://support.wix.com/en/article/wix-stores-managing-emails-sent-to-customers)
- [Wix payment providers by country](https://support.wix.com/en/article/available-payment-providers-in-your-country)
