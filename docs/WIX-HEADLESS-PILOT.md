# Aurum Privée Wix Headless pilot runbook

> Superseded historical runbook. Do not use this document to launch checkout. The active architecture is the B2B RFQ workflow in [`B2B-RFQ-SPEC.md`](./B2B-RFQ-SPEC.md); Wix now supplies private catalogue data only.

## Purpose

This began as an isolated 5–10 fragrance pilot. The full 733-SKU catalogue is now imported and the storefront reads Wix in production, while checkout remains closed pending the same fulfillment and order acceptance checks.

## Pilot catalogue

The following ten current Loyverse variants exercise the highest-risk cases. The names are source labels and must be cleaned in Wix before customer review.

| Loyverse variant ID | Source product | Why it is included |
|---|---|---|
| `c8300bd4-6c9a-4388-ac3a-89d7b2dbb3c1` | Abercrombie & Fitch Naturally Fierce Woman | Women’s classification and low stock |
| `890fecde-200f-4e8f-8d59-7fff43ed02ad` | Al Haramain Amber Oud Ruby Gift Set | Gift-set merchandising |
| `9e897b5d-4b8b-4807-87f0-939ba908b87f` | Afnan Supremacy Incense | Existing reviewed product-page route |
| `460426e4-f854-40f4-9217-7fac41fe75bf` | Dior Sauvage 3.4 EDP | Popular product, corrected brand and rich description |
| `66c09dc0-cc21-4cbd-a9f9-c475a1137486` | Creed Aventus for Her | High-value and currently untracked stock; negative-control case |
| `bbe07acc-3150-4191-b1df-13396ac58f1a` | Giorgio Armani Acqua di Giò Gift Set | Decimal price (`$38.99`) and imported-name cleanup |
| `bb4bf3b6-a6cd-4bba-939d-3ceafbefad16` | Dior Sauvage EDP 6.8 oz | Alternate size represented as a separate Loyverse item |
| `5a6830a8-1249-49b0-a17c-7ac091b9fc88` | Al Haramain Amber Oud Carbon Edition | Arabian collection and low stock |
| `982c8a9c-1768-4667-964b-bb6ba6f93417` | Al Haramain Azlan Oud Bleu | Single remaining unit and oversell test |
| `f87b751d-d3ed-4a70-b4cc-a9c17dd8f3a6` | Armaf Tres Nuit Gift Set | Multi-piece product and collection placement |

Do not publish the Creed variant until its Loyverse stock mode is made tracked or the owner signs off on an explicit untracked-stock policy.

## Accounts and access required from the client

Access should be granted through named collaborators or entered directly in Netlify. Passwords and API secrets must not be pasted into chat, Git, email copy or browser-visible variables.

### Wix

- A client-owned Wix account and project
- Wix Stores and Wix eCommerce installed
- Wix CMS installed for editable editorial content
- Wix Members enabled if customer accounts are included in the pilot
- An appropriate paid business/eCommerce plan before taking payment
- Novio added as a collaborator with only the permissions required for development
- Headless client ID
- Server-side client secret for this headless client
- Wix site ID
- Wix inventory location ID mapped to the Nassau shop
- Wix webhook public verification key
- Allowed redirect domain for `https://aurumprivee.com`
- A proposed Wix pages hostname, preferably `checkout.aurumprivee.com`

### Payment provider

Choose one Wix-supported card provider after merchant approval: CXPay or Tilopay. PayPal may be added as an alternative payment method where approved. Confirm in writing:

- Supported checkout and settlement currencies, including BSD
- Merchant entity and bank-account eligibility
- Processing, refund, chargeback and payout fees
- Payout schedule
- 3-D Secure behavior
- Supported cards and wallets
- Sandbox/test credentials or an approved low-value live test procedure

Wix allows only one connected credit-card processor at a time. Provider selection is therefore a launch decision, not a cosmetic setting.

### Loyverse

- A newly rotated access token with the minimum practical permissions
- Merchant and Nassau store IDs
- Online payment-type ID
- Confirmation that online orders should create completed sale receipts
- Confirmation of the 10% VAT treatment for products and delivery
- Decision for the 16 untracked variants
- Approval to register or update inventory/item webhook callbacks

### Netlify and DNS

- Collaborator access to the existing Aurum Privée Netlify site
- Permission to create encrypted environment variables
- DNS access for the checkout subdomain when the pilot reaches hosted checkout
- No production DNS change during catalogue-only testing

### Business decisions

- Store pickup address, hours and readiness SLA
- Delivery area, fee, tax treatment, courier and cutoff time
- Return/refund/cancellation policy
- Whether guest checkout is allowed
- Whether accounts are required for the pilot or introduced afterward
- Approved customer-service and order-notification addresses

## Environment contract

Copy the Wix section from `.env.example` into `.env.local`. Keep the active catalogue provider selected while both checkout controls remain false during setup:

```dotenv
COMMERCE_PROVIDER=wix
NEXT_PUBLIC_CHECKOUT_ENABLED=false
WIX_CHECKOUT_ENABLED=false
```

Run the sanitized local check with:

```bash
npm run preflight:wix
```

The check reports missing settings and switch state without printing credential values. Configuration alone never enables Wix checkout.

## Implementation sequence

### 1. Project and authentication

1. Create or nominate the client-owned Wix project.
2. Confirm Catalog V3 before importing anything.
3. Create the Headless client and allow the local callback plus `https://aurumprivee.com`.
4. Configure a server-side API key or Headless client secret so the returned order can be verified before the success page confirms it.
5. Create a hidden pilot category and ensure it is not included in production navigation.

### 2. Mapping and catalogue import

1. Create the ten Wix product shells using stable Loyverse-derived handles.
2. Persist the Loyverse variant UUID in a private structured field.
3. Create tracked inventory items for the Nassau-mapped Wix location.
4. Mirror SKU, barcode, base price, VAT classification and current quantity.
5. Clean titles, brands, concentrations and sizes in Wix.
6. Add approved high-resolution product media, accurate descriptions and sourced scent notes.
7. Assign For Her, For Him, Unisex, Arabian and Gift Set categories as applicable.
8. Confirm the custom frontend renders Wix data without changing its visual design.

### 3. Cart and checkout

1. Establish a Wix visitor OAuth session.
2. Add a Wix catalogue reference for each custom-bag line.
3. Create a Wix cart/checkout and compare server totals with the rendered bag.
4. Create a Wix redirect session using the checkout ID.
5. Complete pickup and delivery checkouts through the branded Wix pages hostname.
6. Confirm the customer returns to the custom Aurum Privée success page.

### 4. Orders and Loyverse

1. Subscribe to Wix order-approved, order-updated/canceled and transaction-update events required by the approved flow.
2. Verify the signed webhook JWT before accepting an event.
3. Persist a durable event claim and acknowledge receipt immediately.
4. Fetch the authoritative Wix order from Wix.
5. Create one Loyverse customer only when the customer-sync decision permits it.
6. Create one Loyverse sale receipt using the Wix order reference.
7. Verify the Loyverse quantity and write that absolute quantity back to Wix.
8. Replay the same webhook and prove that no duplicate receipt is created.

### 5. Emails and fulfilment

1. Customize the Wix order-confirmation template to match Aurum Privée.
2. Verify order confirmation, ready-for-pickup, shipping, cancellation and refund messages.
3. Disable overlapping Resend order messages during the Wix pilot.
4. Keep Resend contact/newsletter workflows isolated and unchanged.
5. Mark orders ready and fulfilled in the Wix dashboard and verify the client-facing state.

### 6. Refund and reconciliation

1. Perform a full refund in Wix.
2. Verify exactly one Loyverse refund receipt.
3. Verify inventory returns to the expected absolute quantity in both systems.
4. Run nightly reconciliation and deliberately introduce one safe pilot mismatch to prove repair and alerting.

## Acceptance matrix

| Test | Pass condition |
|---|---|
| Catalogue identity | Every Wix variant maps to exactly one immutable Loyverse variant ID. |
| Merchandising ownership | A description/image edit in Wix appears on the custom site and survives inventory sync. |
| Base price | Wix and Loyverse base price agree before promotions. |
| Tracked inventory | POS sale updates Wix; online sale updates Loyverse; neither loops or double-decrements. |
| Low-stock concurrency | Two attempts for one remaining item produce no more than one paid order. |
| Untracked inventory | Product remains unavailable until a policy is explicitly configured. |
| Search and collections | Custom search and every audience/collection link return the same Wix-classified records. |
| Checkout | Pickup and delivery both calculate correct product, discount, VAT, delivery and total amounts. |
| Payment | Approved, declined and abandoned payments create the correct Wix states. |
| Order sync | One approved Wix order creates exactly one Loyverse receipt. |
| Replay safety | Duplicate or out-of-order webhooks do not duplicate receipts, refunds or emails. |
| Fulfilment | Wix dashboard actions update customer-visible status and send one correct email. |
| Refund | Full refund creates one provider refund, one Wix state transition and one Loyverse refund receipt. |
| Customer account | Guest/member decision works across cart, checkout, login and order history. |
| Mobile | 390×844 and 430×932 flows have no horizontal overflow and all controls remain usable. |
| Accessibility | Keyboard checkout, visible focus, labels, error summary and reduced motion pass review. |
| Rollback | Setting all Wix switches false restores the legacy local storefront path without data loss. |

## Cutover conditions

Only after every acceptance test passes locally and in the isolated provider test environment:

1. Export and review the full Wix catalogue mapping.
2. Import the remaining approved tracked catalogue in batches.
3. Reconcile counts, prices, taxes, images and stock.
4. Freeze catalogue writes during the final delta sync.
5. Obtain explicit owner approval.
6. Change the provider and Wix switches in a controlled deploy window.
7. Monitor orders and inventory continuously through the first trading period.

No code push, Netlify deployment, DNS change or production checkout enablement is authorized by this runbook.
