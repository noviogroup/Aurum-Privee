# Wix headless setup status

Last verified: 12 September 2026

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
- Wix-aware order confirmation and fail-closed 733-SKU mapping check
- Wix catalogue overlay for client-managed names, brands, descriptions, prices, visibility, stock status and media
- Matching non-secret Wix configuration stored in Netlify's production context; it will take effect on the next approved deploy.
- Commerce provider remains `legacy`; Wix checkout remains disabled until the catalog mapping and fulfillment acceptance are complete.

## Verified incomplete

### Protected credential — optional for future automation

The administrative API key has not been generated. It is not required for visitor browsing or Wix-hosted checkout. It will be needed only if Novio later automates server-side catalogue, inventory or order administration. Store it in encrypted Netlify environment settings and never commit it.

### Business and inventory location

Wix Business Info has no address, email or phone. Its default location is not marked as a store inventory location. The available Loyverse data does not provide a complete address:

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

### Wix-hosted pages domain

A branded Wix checkout subdomain can be added later. The initial hosted checkout may use Wix's assigned pages domain, avoiding any change to the Netlify apex and `www` records.

### Webhooks

Custom Wix webhook subscriptions are not required for the initial client-managed Wix order flow. Add them only if Novio later introduces automated downstream order or inventory synchronization, with idempotent handling for order, cancellation, fulfillment and refund events.

### Catalogue

The Wix account contains 9 placeholder products with 21 variants using legacy GHS-era data. They are not the controlled catalogue and should not be deleted or overwritten without explicit approval. A Wix-template-compatible import has been prepared and accepted by the uploader for 707 customer-facing product pages, 733 sellable SKUs and 20 reviewed variant families. The final import action still requires owner confirmation.

## Readiness command

Run:

```bash
npm run preflight:wix
```

The command is expected to fail closed until all 733 approved SKUs are mapped, the Wix provider is selected, and both checkout launch controls are enabled after acceptance testing. A private administrative credential is not required for hosted checkout.
