# Aurum Privée production handoff

Do not place credentials in chat, tickets or this repository. Enter them directly in the production host secret store or share them through an approved password manager.

## Owner decisions

- Rename the Loyverse business and selected store from the former operating name to `Aurum Privée`, or document an explicitly approved legal/operating-name exception.
- Confirm BSD as the storefront and settlement currency.
- Choose the acquiring/payment provider. As of August 2026, The Bahamas is absent from Stripe's supported-business-country list. Bank of The Bahamas advertises a BSD e-commerce payment gateway, and Scotiabank Bahamas advertises hosted checkout and a web-service API. Ask the selected bank for sandbox credentials, hosted-checkout/API documentation, callback signing rules, refund API details and production onboarding requirements.
- Approve creation or selection of a fixed-price, non-stock `New Providence Delivery` item in Loyverse.
- Confirm delivery charge, VAT treatment, service area, cutoff, courier, pickup address and hours.
- Approve privacy, return, shipping and terms language.

## Access to provide

### Hosting and domain

- Netlify team/site access or another approved Next.js host
- DNS access for the final domain
- Final public HTTPS origin

### Supabase

- Project URL
- Service-role key, stored server-side only
- Project/database administrator access for applying migrations

### Payment provider

- Sandbox and production merchant identifiers
- Server/API credentials
- Public/client identifier when required
- Webhook/callback signing secret
- Approved callback and return URLs
- Refund and settlement configuration

### Resend

- API key
- Verified sending domain
- Approved `From` address
- Merchant order-notification address

### Loyverse

- A newly rotated personal access token, or OAuth application credentials
- Set `LOYVERSE_CREDENTIALS_ROTATED=true` after installing the replacement credential in the production secret store
- Approval for the delivery item and online payment type configuration
- Confirmation that the selected store, VAT and customer-sync behavior are correct

## Deployment order

1. Run `npm test`, `npm run test:migrations`, `npm run typecheck`, `npm run lint` and `npm run build`.
2. Create Supabase and apply all fourteen migrations in timestamp order. Confirm that the public `product-images` Storage bucket exists after migration 009, catalog curation is available after migration 010, private clienteling profiles are available after migration 011, private client-care inquiries are available after migration 012, durable transactional-email recovery is available after migration 013, and bounded stale-worker recovery for Loyverse sales/refunds is available after migration 014.
3. Configure public origin, Supabase, high-entropy `SYNC_SECRET`, a separate `RATE_LIMIT_SECRET`, an independent `HEALTH_MONITOR_SECRET`, `OPERATIONS_PASSWORD` and an independent `OPERATIONS_SESSION_SECRET`.
4. Configure the selected payment adapter and Resend.
5. Rotate and configure Loyverse credentials, merchant/store/payment/delivery/tax identifiers.
6. Deploy to public HTTPS.
7. Run `npm run preflight:production`. It performs secret-safe, read-only live checks and must exit successfully before launch. Resolve every reported requirement, then run the protected Loyverse diagnostic, register callbacks and perform the initial full sync.
   Then use `/operations/integrations` to verify every production connection without displaying secret values.
8. Execute every validation in `LOYVERSE-SETUP.md`, including payment replay, last-unit reservation, full refund and newsletter confirmation.
9. Confirm all five Netlify scheduled functions are enabled and review one successful execution of each. This includes the 10-minute transactional-email retry. Public `/api/health` can serve an uptime monitor. Detailed readiness requires `Authorization: Bearer $HEALTH_MONITOR_SECRET`; treat any non-`ok` detailed response as an operational alert and never place that secret in a public monitor URL.
10. Only then set `NEXT_PUBLIC_CHECKOUT_ENABLED=true`, rebuild the public deployment, enable production payment mode and rerun `npm run preflight:production` as the final launch gate. The storefront and checkout API both fail closed while this value is absent or false.

## Product photography

The current snapshot has 659 acceptable source images mirrored locally and 75 bottle-free Aurum Privée editorial placeholders awaiting approved photography. Use `data/missing-product-images.csv` as the acquisition list. Drop approved supplier/manufacturer packshots or Aurum Privée-owned photographs into `product-image-intake`, named by SKU or barcode, and run:

```bash
npm run images:check
npm run images:import
```

Review `data/product-image-import-report.json` and the rendered catalog before deployment. Uploading the same approved image to its Loyverse item makes Loyverse the durable image source for future environments.
