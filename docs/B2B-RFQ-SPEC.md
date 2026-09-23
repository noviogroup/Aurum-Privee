# B2B request-for-quote specification

Status: Active MVP
Owner: Aurum Privée / Novio Group
Last updated: 23 September 2026

## Objective

Give professional fragrance buyers a structured way to propose an assortment without exposing public pricing or turning the website into a self-service checkout.

## Users

- Retailer
- Distributor
- Hospitality buyer
- Corporate buyer
- Other professional buyer reviewed by Aurum Privée

The MVP does not approve trade accounts or verify resale credentials automatically.

## Public journey

1. The buyer browses or searches the catalogue.
2. The buyer adds up to 20 unique products to a device-local quote list.
3. The buyer sets a quantity from 1 to 999 and may add a note of up to 500 characters per product.
4. The buyer supplies company, contact name, business email, buyer type, optional phone, optional destination and optional general notes.
5. The buyer explicitly consents to the use of those details for the enquiry.
6. The server reloads every product from the private catalogue and rejects unknown or unavailable items.
7. The server atomically records the request and returns an `APQ-…` reference.
8. Resend sends a buyer acknowledgement and merchant notification using stable idempotency keys.
9. Staff review the request in the protected operations workspace.

## Public catalogue contract

Anonymous catalogue responses may contain only:

- product ID and slug;
- brand and customer-facing name;
- concentration and size;
- description, audience and scent family;
- fragrance notes and reviewed details source;
- image and alternative text; and
- featured/new-arrival merchandising flags.

Anonymous responses must not contain price, compare-at price, stock, tax information, SKU, barcode, source-system IDs or provider mappings.

## Quote record

Each durable quote record contains:

- internal UUID and client submission UUID;
- public non-sequential reference;
- company and contact details;
- buyer type and optional destination;
- optional general note;
- immutable product snapshots with quantity and optional buyer note;
- workflow status;
- notification state; and
- created/updated timestamps.

The product snapshot preserves what staff reviewed even if the catalogue later changes.

## Workflow states

| State | Meaning |
| --- | --- |
| `new` | Received and not yet reviewed |
| `reviewing` | Staff are assessing availability or commercial terms |
| `needs_info` | More buyer or product information is required |
| `quoted` | Commercial terms have been prepared outside the MVP |
| `closed` | Enquiry is complete, declined or no longer active |

The MVP does not send an automatic email when staff change status.

## Security and reliability

- Same-origin enforcement for submission and staff mutations
- Strict Zod schemas with unknown-field rejection
- Request-body size limits
- Honeypot filtering
- Durable per-client and global rate limits
- Signed HttpOnly operations session
- Server-side catalogue authority
- Atomic create-if-new storage keyed by submission UUID
- Email provider idempotency keys
- Save-before-send behavior so email failure cannot discard an enquiry
- Notification failure visible to staff for manual follow-up
- Quote list cleared only after a successful API response with a reference

## Email behavior

The buyer acknowledgement includes the request reference and product/quantity summary. It must state that the message is not a price quote, order confirmation or reservation.

The merchant notification includes buyer contact details, buyer type, destination, requested products, quantities and notes. It uses the buyer's email as the reply-to address.

## Out of scope for the MVP

- Public or account-specific pricing
- Account approval and credential verification
- Formal quote authoring
- PDF generation
- Quote revisions or expiry
- Buyer acceptance or electronic signature
- Payment, checkout, invoice or order creation
- Inventory reservation
- Freight calculation
- Automated status emails
- CRM or accounting synchronization

## Acceptance criteria

- Public UI and APIs contain no price or inventory data.
- `/checkout` redirects to the catalogue.
- Quote-list state survives navigation and reload on the same device.
- Quantity and note edits persist and remain bounded.
- Invalid, duplicate or unavailable product lines are rejected.
- Rapid retries create one request for a submission UUID.
- Unauthorized staff reads and mutations fail closed.
- Desktop and mobile Chromium/WebKit journeys pass without horizontal overflow or automated WCAG A/AA violations.
- Hosted security headers pass the production test suite.
- One owner-approved controlled request proves real buyer and merchant email delivery.

## Production evidence

On 23 September 2026, controlled internal request `APQ-263ACAFF6E` completed the live storefront flow. The request was saved, the buyer received the success reference, and Resend reported both the buyer acknowledgement and merchant notification as delivered. The request is explicitly marked as an internal test and requires no commercial action.

## Phase 2 decision gates

Before implementing formal quotes, Aurum Privée must approve minimums, pricing ownership, currencies, quote validity, payment terms, freight responsibility, inventory allocation, returns/claims and the accepted-quote handoff. See [CLIENT-HANDOVER.md](./CLIENT-HANDOVER.md) for the complete client decision list.
