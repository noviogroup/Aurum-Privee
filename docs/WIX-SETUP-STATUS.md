# Wix headless setup status

Last verified: 18 September 2026

This document records the live Wix configuration for the existing Aurum Privée site and the remaining gates for the headless-commerce cutover. It contains no credentials.

## Verified complete

- Wix site ID: `7cdfe7ac-5427-4d9f-b8bb-53e568ca63bd`
- Regional format: English — Bahamas
- Main currency: Bahamian Dollar — BSD (`$`)
- Time zone: `(GMT-05:00) Nassau`
- Headless client: `Aurum Privée Netlify Storefront`
- Public OAuth client ID: `77a2c2cf-cc30-4612-b97c-c148ad908c1e`
- Frontend link: `https://aurumprivee.com`
- Canonical Wix storefront origin: `https://aurumprivee.com` (kept separate from the local development origin)
- Allowed redirect domains:
  - `https://aurumprivee.com`
  - `http://localhost:3040`
- Allowed authorization callback URIs:
  - `https://aurumprivee.com/auth/wix/callback`
  - `http://localhost:3040/auth/wix/callback`
- Local Wix SDK dependencies and separate visitor/admin client factories
- Hosted-checkout adapter using the Wix cart → checkout → redirect sequence
- Manual cash payment connected and active, with instructions requiring customers to wait for pickup confirmation before travelling
- The standard Wix customer email for an eligible order is active, but shows zero triggers and no previous run
- The Wix merchant automation for a newly eligible order is active and also shows zero triggers and no previous run; it has unpublished changes that require recipient/content approval before publication
- Wix-aware order confirmation and fail-closed 733-SKU mapping check
- Wix catalogue overlay for client-managed names, brands, descriptions, prices, visibility, stock status and media
- Controlled Wix import completed cleanly for 707 products and 733 sellable variants
- Complete live mapping for all 733 approved SKUs
- Wix product list verified at 716 total products: 707 controlled records plus nine inherited placeholders
- Reviewed Dior Sauvage family spot-checked in Wix with six variants, separate from Dior Eau Sauvage
- Complete product-relationship register for all 733 SKUs, with 2,932 deterministic recommendation links and sibling-variant exclusions
- Matching non-secret Wix configuration stored in Netlify production and deploy-preview contexts and applied to the hardened preview.
- Site-restricted `WIX_API_KEY` generated with only Wix eCommerce permission and stored as a non-readable Netlify secret for production and deploy previews.
- Protected deploy-preview health verification passed with `status: ok`, catalogue reachability, server-side order verification and all 733 mapped variants. A second read-only live check on preview `6aadb9a9329918fc5595117b` independently reported that both the Wix catalogue and order APIs were reachable with 733/733 approved SKUs. The probes used the real runtime credential without revealing or replacing it.
- Production catalogue provider set to `wix`; checkout remains disabled until fulfillment acceptance is complete.

## Verified incomplete

### Business and inventory location

Wix Business Info has Bahamas selected but no address, city, region, postal code, email or phone. Its default location is not marked as a store inventory location. The available Loyverse data does not provide a complete address:

- The intended Loyverse store named `Nassau` contains only `Prince Charles, Nassau`.
- The store ID currently configured locally points to a second legacy location with no address.

Obtain the complete pickup address and confirm which Loyverse store is authoritative before creating or mapping the Wix inventory location.

### Shipping, delivery and pickup

The inherited Wix shipping profile is not launch-safe:

- Domestic region is still Ghana with free shipping.
- International region is the rest of the world with free shipping.
- No Nassau or Harbour Island pickup location is configured.
- No confirmed New Providence delivery policy exists.

Do not enable Wix checkout until the owner confirms the delivery area, delivery fee, pickup address, opening hours, cutoff time and tax treatment. Remove or replace the inherited regions during acceptance setup.

### Tax

Wix has no tax locations, so tax collection is disabled. The dormant default is to add tax at checkout, but no rate can be applied until an approved location and treatment are configured. Obtain owner or accountant approval for whether Bahamian VAT is included in displayed prices or added at checkout before enabling checkout.

### Checkout policies and contact

Terms and conditions, privacy, return, digital-product and custom checkout policies are all disabled. The required policy-agreement checkbox and the checkout `Contact us` link are also disabled. Approve and enable the applicable policies before a controlled order; do not infer policy text from the storefront summaries.

The storefront therefore treats its shipping/returns, privacy and terms pages as interim client-care notices: they are reachable from the footer, marked `noindex,follow` and excluded from the sitemap. Restore indexing only after the corresponding merchant-approved text is published.

### Manual payment and notifications

Manual Payments is the only connected payment method. It is configured as `Cash payment` with the customer instruction: pay in cash when collecting, wait for email or phone confirmation, and do not travel before collection is confirmed. The eligible-order customer email and merchant new-order automation are active, but neither has ever triggered. The merchant automation has unpublished changes and its email action currently previews a generic Wix no-reply sender. Approve its recipient/content before publishing those changes, then verify both customer and merchant delivery during the controlled orders. Approve the cash-only launch path; connect another payment provider only through a separate reviewed acceptance pass.

### Wix-hosted pages domain

A branded Wix checkout subdomain can be added later. The initial hosted checkout may use Wix's assigned pages domain, avoiding any change to the Netlify apex and `www` records.

### Webhooks

Custom Wix webhook subscriptions are not required for the initial client-managed Wix order flow. Add them only if Novio later introduces automated downstream order or inventory synchronization, with idempotent handling for order, cancellation, fulfillment and refund events.

### Inherited catalogue cleanup

The Wix account retains nine placeholder products with legacy GHS-era data. They are not referenced by the 733-SKU storefront map and therefore cannot appear in the custom storefront. They have not been deleted because destructive Wix cleanup still requires explicit owner approval.

The product importer on this Wix V3 catalogue rejected optional category assignment even when supplied with Wix-compatible slugs. The final clean import therefore leaves `categorySlugs` and `primaryCategorySlug` blank. Customer-facing audience, fragrance-family and new-arrival classification remains in the custom storefront. Wix-native categories can be curated separately if the client later needs Wix-hosted catalogue navigation.

## Readiness command

Run:

```bash
npm run preflight:wix
```

The command verifies all 733 approved SKUs are mapped, the Wix provider is selected and server-side order verification is configured. It is expected to remain fail-closed on the two checkout launch controls until fulfillment and controlled-order acceptance testing pass.
