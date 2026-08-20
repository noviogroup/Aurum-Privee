# Aurum Privée Loyverse integration runbook

This integration treats Loyverse as the source of truth for item identity, store price and stock. Supabase stores the storefront catalog and preserves the editorial fields that make Aurum Privée feel curated: imagery, fragrance family, notes, descriptions, featured placement and sort order.

## What the integration does

- Imports active fixed-price variants from the selected Loyverse store.
- Uses store-specific price and sale availability when Loyverse overrides the default variant values.
- Updates stock from `inventory_levels.update` webhooks.
- Updates names, prices, categories, SKUs, barcodes and source imagery from `items.update` webhooks.
- Preserves manually curated Aurum Privée imagery, copy, scent notes and merchandising during later syncs.
- Optionally finds or creates the shopper in Loyverse by email.
- Creates one completed Loyverse receipt after successful online payment.
- Creates a Loyverse refund receipt and restores stock after a full online refund.
- Flags partial refunds for line-level reconciliation in Loyverse Back Office instead of guessing which products to restock.
- Uses the storefront order number for idempotency so payment-webhook retries do not create duplicate receipts.
- Locates existing sale/refund receipts by scanning supported, cursor-paginated receipt results and matching the `order` field locally; the live API does not reliably filter receipts by the `order` query parameter.
- Records failures in Supabase and exposes a protected retry route.
- Reconciles the full catalog nightly and retries failed receipt writes every 15 minutes on published Netlify deploys.
- Atomically reserves stock while checkout is open, keeps a 15-minute webhook-delivery grace period, releases abandoned sessions and converts paid reservations before writing the Loyverse receipt.

## Access and values needed from the account owner

Do not send secret values in ordinary email or chat. Add them directly to the hosting provider's encrypted environment-variable settings or use an approved password manager.

### Loyverse

For one Aurum Privée merchant account, a personal access token is the simplest setup. Loyverse personal access tokens do not offer per-scope controls: each token has unlimited API access to the targeted account. Store it only in encrypted environment settings, set an operational expiration/rotation date, and never expose it to browser code. Use a registered OAuth application instead if scoped access is required.

Provide or configure these values:

| Environment variable | What it is |
| --- | --- |
| `LOYVERSE_ACCESS_TOKEN` | Personal access token or OAuth access token |
| `LOYVERSE_EXPECTED_BUSINESS_NAME` | Approved customer-facing business/store name; currently `Aurum Privée` |
| `LOYVERSE_MERCHANT_ID` | Merchant ID returned by the protected setup diagnostic; used to reject cross-merchant webhook payloads |
| `LOYVERSE_STORE_ID` | The store whose prices and inventory power the website |
| `LOYVERSE_PAYMENT_TYPE_ID` | A payment type enabled for that store, normally named `Online card` |
| `LOYVERSE_DELIVERY_VARIANT_ID` | Variant ID of a fixed-price, non-stock delivery item |
| `LOYVERSE_DELIVERY_TAX_IDS` | Comma-separated tax IDs on the delivery item; copy the setup diagnostic value |
| `LOYVERSE_DELIVERY_ADDED_TAX_RATE` | Sum of the delivery item's `ADDED` tax rates; `10` when the current VAT applies |
| `LOYVERSE_WEBHOOK_TOKEN` | At least 32 random bytes used to protect personal-token webhook callbacks |
| `LOYVERSE_WEBHOOK_AUTH_MODE` | Use `token` for a personal access token |
| `LOYVERSE_SYNC_CUSTOMERS` | `true` to create/update Loyverse customers; otherwise `false` |

Loyverse personal-token webhooks are not signed. This project therefore registers a callback URL containing an unguessable token and compares it in constant time. Treat that URL as a credential. For an OAuth application, set `LOYVERSE_WEBHOOK_AUTH_MODE=oauth` and `LOYVERSE_CLIENT_SECRET`; the route validates Loyverse's lowercase hexadecimal HMAC-SHA1 signature over the exact raw body.

### Supabase and hosting

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`, using the final public HTTPS origin
- `SYNC_SECRET`, a separate high-entropy secret for setup, manual sync and retry routes
- `RATE_LIMIT_SECRET`, a different high-entropy key used to pseudonymize durable abuse-control fingerprints

Run these migrations in order:

1. `supabase/migrations/202608120001_commerce.sql`
2. `supabase/migrations/202608120002_loyverse_integration.sql`
3. `supabase/migrations/202608120003_order_refunds.sql`
4. `supabase/migrations/202608120004_checkout_reservations.sql`
5. `supabase/migrations/202608120005_loyverse_taxes.sql`
6. `supabase/migrations/202608120006_added_taxes.sql`
7. `supabase/migrations/202608120007_security_hardening.sql`
8. `supabase/migrations/202608120008_order_fulfillment.sql`
9. `supabase/migrations/202608120009_product_image_intake.sql`
10. `supabase/migrations/202608120010_product_curation.sql`
11. `supabase/migrations/202608120011_customer_clienteling.sql`
12. `supabase/migrations/202608120012_contact_inquiries.sql`
13. `supabase/migrations/202608120013_transactional_email_recovery.sql`
14. `supabase/migrations/202608120014_loyverse_sync_recovery.sql`

Before applying them remotely, validate the exact chain locally with `npm run test:migrations`. This starts a disposable PostgreSQL 16 database, installs the Supabase roles, applies every migration and exercises reservation conversion.

### Payment and email

The current payment adapter is Stripe. A Bahamas-registered merchant cannot assume Stripe eligibility, so confirm the merchant entity and acquiring arrangement before production. If Stripe is approved, configure its publishable key, secret key and webhook signing secret. If a Bahamian bank gateway is selected, keep the same order and Loyverse synchronization service and replace only the checkout/payment adapter.

For Resend, provide an API key after the Aurum Privée sending domain has been verified, plus the approved sender and merchant notification addresses.

## Loyverse Back Office preparation

1. Confirm the production business/store name and currency. Both live Loyverse names should match `LOYVERSE_EXPECTED_BUSINESS_NAME`, unless the owner explicitly approves a different legal/operating name. The store currency must match `NEXT_PUBLIC_STORE_CURRENCY`.
2. Confirm that every web product has a fixed-price variant, is available for sale at the selected store and has a unique SKU or barcode where possible.
3. Create an `Online card` payment type and enable it for the selected store.
4. Create a service item such as `New Providence Delivery`. Make it fixed-price and do not track stock. Use its variant ID for `LOYVERSE_DELIVERY_VARIANT_ID`. The storefront supplies the actual delivery price on the receipt.
5. Decide whether online payments should post immediately as completed receipts. That is the implemented behavior.
6. Confirm tax configuration. Perform a test sale and ensure the Loyverse receipt total and payment total reconcile exactly before launch. The checkout supports both `INCLUDED` and `ADDED` Loyverse taxes, shows added VAT separately, and refuses order synchronization when the calculated receipt total differs from the amount paid.

## Live account audit — 12 August 2026

- Currency: BSD; country: The Bahamas.
- Store: legacy name `Iola Lily` in Loyverse, ID `abdd8cc2-2fd5-40d8-8ac3-98b9af876818`, with four POS devices. Rename the business and selected store to `Aurum Privée`, or document an approved legal-name exception.
- Tax: `Value Added Tax - 10`, 10%, type `ADDED`, automatically applied to new items and currently attached to about 1,990 items.
- Payment types: Cash, Card, RBC Direct and Gift certificate. Existing Card ID: `54b01027-7497-4b3b-9244-4ba6873ec85f`.
- Catalog: 1,994 items and 1,999 variants. The fragrance-only, tester-excluded, positive-stock local assortment currently contains 734 fixed-price variants. It includes 659 acceptable Loyverse images mirrored locally and 75 bottle-free Aurum Privée editorial placeholders awaiting approved photography. Dolce & Gabbana Dolce Rose is among those 75 because its Loyverse source is only 80×80 pixels. The missing-image worksheet is `data/missing-product-images.csv`.
- Webhooks: none are registered yet. Registration requires the final public HTTPS origin; localhost cannot receive Loyverse callbacks.
- Access: the supplied personal token is working and has been verified against merchant, store, payment-type, tax, catalog, inventory, receipt and webhook-list endpoints. Because a personal token has full account access and was shared through chat, rotate it before production.

The protected local setup diagnostic currently reports five expected launch blockers:

1. The connected business is still named `Iola Lily`, while the approved storefront brand is `Aurum Privée`; rename it or document an approved legal-name exception.
2. The selected store is also named `Iola Lily`; confirm or rename it in Loyverse Back Office.
3. No delivery/service item exists. Create a fixed-price, non-stock `New Providence Delivery` item, attach the approved tax treatment, and configure its variant ID.
4. `NEXT_PUBLIC_SITE_URL` is localhost rather than a public HTTPS deployment.
5. Supabase has not been configured and migrated.

## Deployment sequence

After the site is deployed and the environment variables are present, set local shell variables without printing their values:

```bash
export LOLA_SYNC_SECRET='value-from-host-secret-store'
export LOLA_SITE_URL='https://shop.lolalily.example'
```

Check the connection and list the matched store/payment configuration:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  "$LOLA_SITE_URL/api/setup/loyverse"
```

Register or repair both required webhooks:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  "$LOLA_SITE_URL/api/setup/loyverse"
```

Import the full catalog:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  "$LOLA_SITE_URL/api/sync/loyverse"
```

The first setup diagnostic returns the merchant ID needed for `LOYVERSE_MERCHANT_ID`; add it to the deployment environment and run the diagnostic again. The response redacts the webhook token. A clean response has `connected: true`, an empty `issues` array, and no failed operational counts.

## Validation before accepting live orders

1. Compare at least five products across Loyverse and the website: name, variant, price and in-stock quantity.
2. Change one item price in Loyverse and confirm the website updates after the webhook.
3. Change one inventory quantity and confirm the website updates.
4. Complete a low-value payment-provider test order using pickup.
5. Confirm exactly one paid order exists in Supabase, one receipt exists in Loyverse and both carry the same order number.
6. Complete a delivery test. Confirm the delivery line appears on the receipt and the Loyverse payment total equals the payment-provider total.
7. Replay the successful payment webhook. Confirm no duplicate order or receipt is created.
8. Confirm the customer and merchant emails render correctly and arrive from the verified domain.
9. Review `loyverse_webhook_events`, `integration_runs` and the order's `loyverse_sync_status` for errors.
10. Fully refund the test payment. Confirm the order becomes `refunded`, exactly one Loyverse refund receipt is created and its item quantities return to stock.
11. Perform a partial refund test. Confirm the order becomes `partially_refunded` and `loyverse_refund_sync_status` becomes `manual_required`; complete the corresponding line-level refund in Loyverse Back Office.
12. Open checkout for the last unit of a test product in one browser. Confirm a second browser cannot reserve that unit, then expire the first test session and confirm the unit becomes available again.
13. Submit a newsletter address, confirm it remains `pending`, use the emailed confirmation button and verify it changes to `subscribed`. Verify a previously unsubscribed address cannot become subscribed without a fresh confirmation.
14. Call the protected fulfillment endpoint with a paid test order and `ready`, then `fulfilled`. Confirm each valid transition sends one email and an identical retry reports `duplicate: true` without resending.

## Staff order operations

List the newest paid orders from a trusted operator terminal:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  "$LOLA_SITE_URL/api/orders?fulfillment=unfulfilled&limit=50"
```

Mark an order ready for pickup or delivery and send its customer update:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"orderId":"ORDER_UUID","status":"ready"}' \
  "$LOLA_SITE_URL/api/orders/fulfillment"
```

Use `fulfilled` after collection/delivery or `cancelled` when fulfillment will not proceed. The transition is durable, and Resend uses an idempotency key per order/status. A failed email can be retried with the identical request; a successfully sent update is not sent again.

If an order receipt fails after payment, fix the configuration and retry pending/failed orders:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $LOLA_SYNC_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"limit":25}' \
  "$LOLA_SITE_URL/api/sync/loyverse/orders"
```

The retry endpoint can target one database order with `{"orderId":"..."}`.

The schedules are configured in `netlify.toml`. Netlify scheduled functions run in UTC and only on published production deploys. After the first production deploy, confirm all five functions have a `Scheduled` badge and a next-run time in the Netlify Functions dashboard. Run each once manually from that dashboard before accepting orders: inventory reservation cleanup, transactional-email retry, Loyverse order/refund retry, nightly catalog reconciliation and the private store-health monitor.

## Operational notes

- Catalog sync never overwrites curated image, description, scent-note, featured or sort-order fields once a product row exists.
- Approved Loyverse source images are mirrored locally and hash-pinned; source URLs that fail minimum quality validation remain on the photography worksheet.
- A full sync deactivates products that no longer exist in Loyverse; item webhooks update only the affected items.
- Products with variable pricing are excluded because an online checkout needs a deterministic amount.
- Products not available for sale at the configured store are excluded.
- Untracked inventory is represented as effectively unlimited storefront stock.
- Negative Loyverse inventory is clamped to zero. A connected but empty or failed database catalog never falls back to demo products.
- Active checkout reservations are subtracted from displayed availability. Reservation creation and stock checks run in one database transaction, preventing two concurrent checkouts from claiming the same last bottle.
- The payment-success webhook records a paid order before creating the Loyverse receipt. Failed receipt synchronization does not reverse the payment; it is visible and retryable.
- Full payment refunds create idempotent Loyverse refund receipts from the original receipt line IDs. Partial refunds are intentionally manual because a payment amount alone does not identify which perfume quantities should be restocked.
- Transient Loyverse 429 and server errors are retried with bounded backoff. Persistent failures are recorded and left for the webhook or scheduled recovery path.
- Rotate `LOYVERSE_WEBHOOK_TOKEN` by changing it in the host and calling the setup POST route again. Remove the old callback from Loyverse after the new one is verified.
