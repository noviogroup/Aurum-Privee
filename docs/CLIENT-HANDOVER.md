# Aurum Privée B2B catalogue handover

Updated for client review on 23 September 2026.

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
4. Receive an on-screen confirmation with an `APQ-…` reference; an email acknowledgement is also attempted.
5. Wait for the trade team to confirm availability and the next commercial step.

The website must not publish unapproved claims about authorization, territories, minimums, guaranteed availability, response time, freight, payment, returns or lead times.

## Catalogue and content ownership

Wix-managed product changes flow into the storefront through the catalogue integration. The custom design, navigation, trade-programme copy, quote workflow, SEO metadata and protected operations experience are maintained in the Novio Group repository.

Product imagery must be owned by Aurum Privée or licensed for this use. A resolving image URL is not visual approval. Naming, concentrations, sizes and photography should continue through the catalogue review process.

## Operating defaults and ownership

The instruction to use standard B2B practices is implemented in [B2B-OPERATING-DEFAULTS.md](./B2B-OPERATING-DEFAULTS.md): professional buyers, quote-specific minimums and freight, seven-day quote validity unless stated otherwise, and payment before dispatch unless credit is approved in writing. A two-business-day first-response target is internal until staff coverage is assigned.

Record the named trade inbox owner and backup, actual supplier minimums, supported carrier routes, merchant legal identity and privacy/retention owner during handover. Written quotes must contain the final transaction-specific terms. Staff status changes do not send emails automatically.

## Acceptance checklist

- [Complete] Public prices, checkout controls and geographic claims removed.
- [Complete] Public catalogue allowlisted to non-commercial merchandising fields.
- [Complete] Quantity-aware quote list implemented.
- [Complete] Buyer/company RFQ form implemented with consent and abuse protection.
- [Complete] Server-side product revalidation and atomic duplicate protection implemented.
- [Complete] Buyer acknowledgement and merchant notification templates implemented.
- [Complete] Protected quote-review workspace implemented.
- [Complete] Desktop/mobile Chromium and WebKit release suite passed on production.
- [Complete] Controlled request `APQ-263ACAFF6E` was saved and both real emails were reported delivered by Resend on 23 September 2026.
- [Required] Confirm the monitored trade inbox owner and response process.
- [Required] Apply the operating defaults and include final fulfilment, returns and claims terms in each written quote.
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
