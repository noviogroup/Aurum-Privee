# Aurum Privée storefront handover

Prepared for client review on 17 September 2026.

## What has been built

- A custom Aurum Privée storefront at `https://aurumprivee.com`, hosted on Netlify and maintained from the Novio Group GitHub repository.
- A responsive luxury-fragrance experience covering the homepage, searchable catalogue, product pages, saved fragrances, an honest account-availability state, bag, checkout shell, client-care form and operations area.
- Clean public routes for `/about` and `/contact`, with permanent redirects from the former `/pages/about` and `/pages/contact` addresses.
- A structured catalogue of 733 sellable fragrance SKUs. Twenty product families have been reviewed for presentation as one product with selectable editions instead of unrelated duplicate pages.
- An explainable relationship model for every SKU. Each product page shows four distinct in-stock alternatives ranked from verified notes, scent family, audience, brand line, concentration and price, with a visible reason for each connection.
- Consistent BSD price presentation, customer-facing brand names, concentration labels, sizes and stock-aware catalogue behaviour.
- Transactional email infrastructure through Resend for the existing order and client-care workflows. The sending domain is verified and its restricted credential is stored as a protected hosting variable, not in source control. A monitored notification inbox is still required before acceptance messages can be tested.
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

Customer account sign-in remains deferred until the business chooses a Wix guest/member policy and accepts the complete login and order-history flow. Until then, the account page does not offer a separate Supabase identity that would omit Wix orders. Saved fragrances remain private to the customer's device, and order help routes through client care.

## Catalogue model

The Wix catalogue contains 707 controlled customer-facing product pages and 733 sellable SKUs. Twenty reviewed fragrance families consolidate valid size or concentration choices on one product page. Similar names are not automatically merged: for example, Dior Sauvage and Dior Eau Sauvage remain distinct products.

The source SKU is preserved on every imported variant so that Wix records can be mapped back to the existing inventory data. All 733 SKUs are mapped to their live Wix product and variant IDs. Product URLs, fragrance-family classification, verified notes and the reviewed grouping rules remain protected in the custom storefront, while routine commerce fields come from Wix. The legacy Wix account currently also contains nine placeholder products, for 716 total Wix products. They have not been deleted because removal requires explicit owner approval.

### Variants versus related products

Variants and recommendations are intentionally different:

- A variant is another size or concentration of the same fragrance. Only 20 manually reviewed families are allowed to merge, covering 46 SKUs. On those pages, the customer sees **Choose your edition** and can select the exact size and concentration.
- A related product is a separate fragrance that may be a useful alternative. Every controlled SKU has four ranked connections. The current product and all of its sibling editions are excluded, and another variant family can appear only once.
- Similar wording never creates a variant. Dior Sauvage has six selectable editions; Dior Eau Sauvage and Eau Sauvage Extreme remain independent fragrances and can appear as related Dior alternatives.

The complete client-readable register is in `docs/PRODUCT-RELATIONSHIPS.md`; the machine-readable source is `data/product-relationships.json`. Run `npm run catalog:relationships` after changing catalogue data, verified notes or the reviewed variant list. The command fails if any controlled SKU loses its Wix mapping or its four connections.

## Payments and fulfillment

Cash collection is connected and active in Wix. Its checkout instruction tells the customer to wait for an email or call confirming the selected pickup location before travelling. Bank transfer can be added as soon as the business supplies its approved receiving-account instructions.

The intended service areas are:

- Nassau, New Providence, The Bahamas;
- Harbour Island, Eleuthera, The Bahamas;
- Ghana, with the city and service details still to be confirmed.

The storefront must not advertise a street address, opening hours, delivery rate or cutoff time until the business confirms that information.

## Wix readiness verified 13 September 2026

- The controlled import completed cleanly: Wix reported 707 products updated with no failures or partial-import warnings on the final pass.
- Wix now contains 716 products: 707 controlled Aurum Privée products plus nine inherited placeholders that remain isolated from the custom storefront.
- All 733 sellable SKUs are mapped to live Wix V3 variants, including the 20 reviewed variant families. The grouped Dior Sauvage product was spot-checked in Wix with six selectable variants; Dior Eau Sauvage remains a separate product.
- Manual cash payment is connected, active and carries the approved collection-confirmation instruction.
- Fulfillment is not launch-safe: Wix still exposes the inherited `Domestic Ghana` free-shipping region and `Rest of the world` free-shipping region, with no configured Nassau or Harbour Island pickup location.
- The production storefront reads the controlled catalogue from Wix. Both checkout launch controls remain disabled until fulfillment setup and acceptance testing are complete.
- A site-restricted Wix API key with only Wix eCommerce permission was generated and stored as a non-readable Netlify production and deploy-preview secret on 17 September 2026. It still requires runtime verification through the next preview before checkout acceptance.

## Information still required from the client

1. Complete pickup addresses, contact numbers, opening hours and order cutoffs for Nassau and Harbour Island.
2. Ghana city, complete location details, local fulfillment process, currency and tax treatment.
3. Delivery zones, charges, free-delivery thresholds and expected delivery windows for each market.
4. Bank-transfer instructions: beneficiary name, bank, account details, currency, payment reference format and proof-of-payment process.
5. The monitored order email address and phone/WhatsApp number.
6. Written approval of the returns, cancellations, refunds, privacy and terms content.
7. Confirmation that the nine inherited Wix placeholder products may be removed.

## SEO ownership

The custom storefront controls technical SEO: page titles and descriptions, canonical URLs, structured product data, sitemap, robots rules, image alternative text, redirects and frontend performance. Wix will manage catalogue data used by those product pages after cutover. Search Console, analytics, conversion tracking and merchant feeds should be verified after the final domain and checkout flow are live.

## Launch acceptance checklist

- [Complete] Import the controlled Wix catalogue and build the 733-SKU live mapping.
- [Complete] Verify the reviewed variant model in Wix, including the six-edition Dior Sauvage family.
- [Complete] Generate and verify four explainable related-product connections for every controlled SKU.
- Configure and verify the three fulfillment markets with real business details.
- Complete one cash-pickup order from a phone and a desktop browser.
- Confirm that the order appears in Wix with the correct SKU, quantity, customer, total and pickup location.
- Verify customer and merchant notifications.
- Configure server-side Wix order verification and prove that only an approved order can display confirmation and clear the bag.
- Test cancellation, refund and stock-update behaviour.
- Approve production checkout and monitoring.

Until the remaining fulfillment and order acceptance checks pass, the public storefront remains available for Wix-backed browsing while checkout stays deliberately gated.
