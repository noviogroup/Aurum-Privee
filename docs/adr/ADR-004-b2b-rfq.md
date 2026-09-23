# ADR-004: B2B catalogue and request-for-quote workflow

- Status: Accepted
- Date: 2026-09-22
- Deciders: Aurum Privée owner and Novio Group implementation lead
- Supersedes: ADR-002 and ADR-003 as the active public transaction model

## Context

Aurum Privée changed direction from a direct-to-consumer online store to a business-to-business fragrance supplier. Public pricing, cart, checkout, consumer fulfilment and location messaging no longer fit the operating model. Buyers instead need to assemble a product list and request private commercial terms.

## Decision

Use the custom Next.js site as a privacy-safe trade catalogue and structured RFQ interface.

- Wix remains the private catalogue source.
- Public product responses use an explicit allowlist of merchandising fields.
- Quote lists remain device-local until submission.
- The server revalidates product identity against the private catalogue.
- Netlify Blobs stores durable quote requests, submission-idempotency state and rate limits.
- Resend sends buyer and merchant RFQ messages.
- The protected operations workspace owns review status.
- The public site does not expose prices, accept payments or create orders.

The complete behavioral contract is maintained in [B2B-RFQ-SPEC.md](../B2B-RFQ-SPEC.md).

## Consequences

- Commercial terms can vary by buyer without leaking public price data.
- The website can support a sales conversation before the business finalizes formal quoting and invoicing systems.
- Staff must manually prepare and communicate binding terms outside the MVP.
- Wix checkout configuration and legacy payment integrations are no longer launch dependencies.
- Reintroducing ecommerce would require a new accepted ADR, restored customer-facing commerce content and a complete payment/order acceptance cycle.

## Rejected alternatives

### Hide prices but keep cart and checkout

This preserves a consumer mental model and creates ambiguity about whether a buyer is placing an order or merely requesting terms.

### Email-only contact form

An unstructured message does not reliably capture product identity, quantities or line-level buyer notes.

### Public wholesale price list

The client has not approved universal prices, minimums, currencies or customer eligibility. Publishing values prematurely would create commercial and operational risk.
