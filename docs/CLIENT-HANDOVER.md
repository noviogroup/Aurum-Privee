# Aurum Privée storefront handover

Prepared for client review on 12 September 2026.

## What has been built

- A custom Aurum Privée storefront at `https://aurumprivee.com`, hosted on Netlify and maintained from the Novio Group GitHub repository.
- A responsive luxury-fragrance experience covering the homepage, searchable catalogue, product pages, saved fragrances, account area, bag, checkout shell, client-care form and operations area.
- Clean public routes for `/about` and `/contact`, with permanent redirects from the former `/pages/about` and `/pages/contact` addresses.
- A structured catalogue of 733 sellable fragrance SKUs. Twenty product families have been reviewed for presentation as one product with selectable editions instead of unrelated duplicate pages.
- Consistent BSD price presentation, customer-facing brand names, concentration labels, sizes and stock-aware catalogue behaviour.
- Transactional email infrastructure through Resend for the existing order and client-care workflows. Credentials are stored as protected hosting variables, not in source control.
- A connected Wix Headless client for the existing Wix account. Wix is being established as the business-management layer while the custom Aurum Privée design remains on Netlify.
- A Wix catalogue read layer that reflects client-managed names, brands, descriptions, prices, visibility, stock status and product media in the custom storefront after cutover. The storefront refreshes its Wix catalogue cache automatically; no design rebuild is required for routine product edits.

## What the client will manage in Wix

Once the commerce cutover is accepted, the client can use Wix for:

- products, prices, options and variants;
- stock availability;
- orders, customer records and fulfillment status;
- manual payment methods;
- coupons, discounts and abandoned-cart workflows;
- store automations, customer emails and commerce analytics.

The custom page design, navigation, editorial layouts and frontend code are not edited in the Wix drag-and-drop editor. Novio Group maintains those in the storefront repository. Promotional content can be connected to Wix CMS later if the client needs routine editing access.

## Catalogue model

The prepared Wix import contains 707 customer-facing product pages and 733 sellable SKUs. Twenty reviewed fragrance families consolidate valid size or concentration choices on one product page. Similar names are not automatically merged: for example, Dior Sauvage and Dior Eau Sauvage remain distinct products.

The source SKU is preserved on every imported variant so that Wix records can be mapped back to the existing inventory data. Product URLs, fragrance-family classification, verified notes and the reviewed grouping rules remain protected in the custom storefront, while routine commerce fields come from Wix. The legacy Wix account currently also contains nine placeholder products. They have not been deleted because removal requires owner approval.

## Payments and fulfillment

Cash collection is connected and active in Wix. Its checkout instruction tells the customer to wait for an email or call confirming the selected pickup location before travelling. Bank transfer can be added as soon as the business supplies its approved receiving-account instructions.

The intended service areas are:

- Nassau, New Providence, The Bahamas;
- Harbour Island, Eleuthera, The Bahamas;
- Ghana, with the city and service details still to be confirmed.

The storefront must not advertise a street address, opening hours, delivery rate or cutoff time until the business confirms that information.

## Wix readiness verified 12 September 2026

- Wix still contains the nine inherited placeholder products; the controlled Aurum Privée catalogue has not yet been imported.
- The prepared import contains 707 customer-facing products and 733 sellable SKUs, including the 20 reviewed variant families.
- Manual cash payment is connected, active and carries the approved collection-confirmation instruction.
- Fulfillment is not launch-safe: Wix still exposes the inherited `Domestic Ghana` free-shipping region and `Rest of the world` free-shipping region, with no configured Nassau or Harbour Island pickup location.
- The production storefront remains on the legacy commerce provider with both checkout launch controls disabled. This is intentional until catalogue import, fulfillment setup and acceptance testing are complete.

## Information still required from the client

1. Complete pickup addresses, contact numbers, opening hours and order cutoffs for Nassau and Harbour Island.
2. Ghana city, complete location details, local fulfillment process, currency and tax treatment.
3. Delivery zones, charges, free-delivery thresholds and expected delivery windows for each market.
4. Bank-transfer instructions: beneficiary name, bank, account details, currency, payment reference format and proof-of-payment process.
5. The monitored order email address and phone/WhatsApp number.
6. Written approval of the returns, cancellations, refunds, privacy and terms content.
7. Wix authorization for the protected server credential and webhook configuration.
8. Confirmation that the nine inherited Wix placeholder products may be removed.

## SEO ownership

The custom storefront controls technical SEO: page titles and descriptions, canonical URLs, structured product data, sitemap, robots rules, image alternative text, redirects and frontend performance. Wix will manage catalogue data used by those product pages after cutover. Search Console, analytics, conversion tracking and merchant feeds should be verified after the final domain and checkout flow are live.

## Launch acceptance checklist

- Import and review the prepared Wix catalogue.
- Confirm every reviewed product family and its variant pricing.
- Configure and verify the three fulfillment markets with real business details.
- Complete one cash-pickup order from a phone and a desktop browser.
- Confirm that the order appears in Wix with the correct SKU, quantity, customer, total and pickup location.
- Verify customer and merchant notifications.
- Test cancellation, refund and stock-update behaviour.
- Approve production checkout and monitoring.

Until those acceptance checks pass, the public storefront remains available for browsing while checkout stays deliberately gated.
