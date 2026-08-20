# Payment provider handoff

## Current state

The repository includes a complete Stripe Checkout Sessions adapter with secure server-side pricing, hosted checkout, signature-verified webhook handling, order persistence, email confirmation and Loyverse receipt creation.

Stripe supports BSD as a presentment currency, but it does not currently list The Bahamas as a supported country for merchant onboarding. Do not open or operate a Stripe account under inaccurate business information.

## Recommended decision path

1. Ask Aurum Privée whether it already has an active online merchant account and which bank or processor provides it.
2. If Aurum Privée has an eligible Stripe account through a real supported-country entity, use the included Stripe adapter.
3. If Aurum Privée is a Bahamas-only merchant, request a Bank of The Bahamas e-Commerce proposal and API/integration pack, and compare it with the merchant's current bank gateway.
4. Prefer a hosted payment page or tokenized fields. Card numbers must never pass through this Next.js server.

## What to request from the selected provider

- Sandbox merchant ID and API credentials
- Hosted checkout or tokenization documentation
- Webhook or server-notification documentation
- Signature-verification secret and algorithm
- Test card numbers and expected success, decline and 3-D Secure flows
- BSD settlement support, fees and settlement timing
- Refund and void API documentation
- Allowed return, cancel and webhook URLs
- Production onboarding checklist and PCI responsibilities

The provider swap is intentionally limited to `app/api/checkout/route.ts` and `app/api/stripe/webhook/route.ts`. The cart, order table, email flow and Loyverse writeback can remain unchanged.
