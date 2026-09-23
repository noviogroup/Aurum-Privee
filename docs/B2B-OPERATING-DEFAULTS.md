# B2B operating defaults

Prepared 23 September 2026 following the instruction to proceed with standard B2B practices. These are Aurum Privée implementation defaults, not claims of a universal fragrance-industry standard. The written quote can specify different terms by agreement.

## Commercial starting point

| Area | Default |
| --- | --- |
| Buyers | Retailers, distributors, hospitality, corporate and other professional organisations; manually verify business details before approving a trading relationship. No consumer checkout. |
| Minimums | Product, brand, case-pack and order-value requirements are confirmed per quote against supplier terms. No invented blanket minimum. A requested quantity of one is not a promise to supply one. |
| Currency | Explicitly identify currency on every quote and invoice. Existing internal store currency configuration is BSD; do not change it or assume a buyer's currency. |
| Validity | Seven calendar days unless a written quote states otherwise. Reconfirm price and availability after expiry or a requested revision. |
| Payment | Cleared payment before dispatch. Credit only after written approval; no automatic net terms. Payment instructions belong on the private invoice. |
| Stock | Requests do not reserve stock. Confirm allocation and timing in the accepted quote; no substitutions without buyer agreement. |
| Freight | Confirm destination, carrier acceptance, method, estimated timing, cost and responsibility for tax/duty/clearance before acceptance. Fragrance restrictions must be checked with the carrier. No blanket worldwide-shipping promise. |
| Claims | Prompt inspection and notification with reference, photos and quantities; retain packaging; written return authorisation. Specify deadlines, eligibility and cancellation costs in each quote. |
| Service target | Internal first personal response within two business days; triage each business day. Do not publish a guaranteed SLA until coverage is assigned. |

## Daily staff workflow

1. The trade inbox owner opens `/operations/quotes` each business day. The operations queue is the source of truth even if notification email fails.
2. Review all `new` requests, including those with pending/failed notification. Record the reference in the email thread and assign an owner in the team's existing work tracker.
3. Set `reviewing`; validate the buyer, products, unit/case quantities, destination, supplier availability and landed costs.
4. If details are missing, email the buyer manually and set `needs_info`. A status change does not send a message.
5. Prepare a versioned quote outside the website. Include APQ reference, buyer/seller details, currency, itemised quantities and prices, taxes, freight responsibilities, minimums, payment terms, estimated dispatch, expiry, and claims/cancellation terms.
6. Send it to the buyer and set `quoted`. Retain written acceptance and changes. Invoice through the existing accounting process; verify payment and stock before release.
7. Confirm dispatch/tracking and record the resulting invoice/order reference in the external work tracker. Set `closed` when follow-up is complete or the enquiry is declined; retain the outcome externally because the MVP has no staff-note or invoice fields.
8. Escalate unanswered requests beyond the two-business-day internal target. For failed email, verify the address, reply manually using the reference and avoid asking the buyer to resubmit an already-saved request.

## Privacy operations

The website notice describes the actual collection, local storage, enquiry use and current service providers. A quote does not opt the buyer into marketing. Staff must handle access/correction/deletion and unsubscribe requests manually; no automated retention or deletion capability is claimed. Confirm the merchant's legal identity/contact details, provider arrangements and a documented retention schedule as part of operational handover. Do not collect ID documents or payment details through free-text forms.

## Deployment handover facts still to record

These cannot be derived from an industry convention: the named inbox owner and backup, actual supplier minimums/case packs, supported carrier routes, merchant legal identity and the person responsible for privacy requests. They are operational facts, not reasons to hold the code fixes.

## References

- Faire explains that brands set their own order minimums: https://www.faire.com/support/articles/360016302912
- Shopify supports buyer-specific payment terms: https://help.shopify.com/en/manual/b2b/checkout-and-orders/payment-terms
- Shopify supports per-variant quantity rules: https://help.shopify.com/en/manual/b2b/catalogs/quantity-pricing
- Bahamas Data Protection Commissioner's privacy notice topics: https://www.dataprotection.gov.bs/privacy-policy

The seven-day validity and two-business-day internal response target are chosen operating defaults, not requirements imposed by these references.
