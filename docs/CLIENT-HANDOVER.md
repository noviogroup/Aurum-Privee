# Aurum Privée B2B catalogue handover

Updated for client review on 22 September 2026.

## What is live

Aurum Privée now operates as a trade fragrance catalogue and digital request-for-quote service at `https://aurumprivee.com`.

Professional buyers can:

- browse the designer, niche and Arabian fragrance catalogue;
- search and filter by house, product, format, audience or scent family;
- add products to a private quote list stored on their device;
- set a requested quantity and optional note for each product;
- identify their company and buyer type; and
- submit the complete selection for private commercial review.

The website does not display prices, inventory counts or geographic service claims. It does not accept payment or create an order. A quote request begins a business conversation; it is not a reservation, binding quotation or acceptance.

## What the client manages

### In Wix

Wix remains the private catalogue source for routine product management:

- product and variant identity;
- names, descriptions and media;
- catalogue visibility; and
- internal price and inventory information.

Price, stock, tax, SKU, barcode and Wix provider identifiers remain private and are not returned by the public catalogue API.

### In the Aurum Privée operations workspace

Authorized staff use `/operations/quotes` to review:

- the buyer and company;
- requested products and quantities;
- product-level and general notes;
- contact details and destination information; and
- email-delivery state.

Staff can move a request through `new`, `reviewing`, `needs_info`, `quoted` and `closed`. The current system does not author a price quote, generate a PDF, accept a quote or create an invoice.

### In Netlify and Resend

Netlify hosts the application and provides private quote storage and rate-limit state. Resend sends the buyer acknowledgement and merchant notification. Production credentials remain encrypted hosting variables and are never stored in source control.

## Buyer communication

The active customer promise is intentionally narrow:

1. Browse the catalogue.
2. Build a proposed assortment and set quantities.
3. Submit company and contact details.
4. Receive an acknowledgement with an `APQ-…` reference.
5. Wait for the trade team to confirm availability and the next commercial step.

The website must not publish unapproved claims about authorization, territories, minimums, guaranteed availability, response time, freight, payment, returns or lead times.

## Catalogue and content ownership

Wix-managed product changes flow into the storefront through the catalogue integration. The custom design, navigation, trade-programme copy, quote workflow, SEO metadata and protected operations experience are maintained in the Novio Group repository.

Product imagery must be owned by Aurum Privée or licensed for this use. A resolving image URL is not visual approval. Naming, concentrations, sizes and photography should continue through the catalogue review process.

## Information still required from the client

1. Which buyer types Aurum Privée will approve.
2. Minimum opening and repeat-order quantities.
3. Whether minimums apply per product, brand, case or total request.
4. Currency and the method used to prepare private pricing.
5. Quote-validity period and revision rules.
6. Payment terms and the point at which inventory is allocated.
7. Supported destinations and freight responsibility.
8. Lead-time language that the business can reliably meet.
9. Returns, shortages, damages, cancellations and claims procedure.
10. The monitored trade inbox and target response time.
11. Approved sourcing, authenticity and brand-relationship claims.
12. The process for converting an accepted quote into an invoice and fulfilment instruction.

## Acceptance checklist

- [Complete] Public prices, checkout controls and geographic claims removed.
- [Complete] Public catalogue allowlisted to non-commercial merchandising fields.
- [Complete] Quantity-aware quote list implemented.
- [Complete] Buyer/company RFQ form implemented with consent and abuse protection.
- [Complete] Server-side product revalidation and atomic duplicate protection implemented.
- [Complete] Buyer acknowledgement and merchant notification templates implemented.
- [Complete] Protected quote-review workspace implemented.
- [Complete] Desktop/mobile Chromium and WebKit release suite passed on production.
- [Required] Submit one controlled internal quote and verify both real email deliveries.
- [Required] Confirm the monitored trade inbox owner and response process.
- [Required] Approve commercial, fulfilment, returns and claims rules.
- [Required] Train staff on quote states and reference handling.

## Recommended next phase

After the business rules above are approved, the next release may add:

- staff-authored pricing and commercial terms;
- branded email and PDF quotations;
- quote versioning, validity dates and expiry;
- buyer accept/decline actions;
- approved trade accounts and account-specific price lists;
- conversion of accepted quotes into invoices or orders; and
- inventory-allocation and fulfilment handoff.

The active technical and operational contract is [B2B-RFQ-SPEC.md](./B2B-RFQ-SPEC.md). Checkout-era handover and pilot documents are historical references only.
