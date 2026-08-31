# ADR-001: Commerce and provider integration boundaries

- Status: Superseded by ADR-002
- Date: 2026-08-12

## Context

Aurum Privée sells from one inventory pool shared with Loyverse. The storefront also crosses Stripe, Supabase, Resend, and scheduled Netlify functions. Payment and webhook delivery are asynchronous and at-least-once, while provider calls cannot participate in one database transaction.

## Decision

Supabase is the commerce coordination layer. It owns inventory holds, paid-order persistence, event claims, subscriber consent, rate-limit counters, and the state machines for Loyverse side effects.

- Browser values are advisory. Product identity, price, taxes, availability, and delivery rules are reloaded server-side.
- Checkout creation requires a durable per-actor rate-limit claim and a bounded active-reservation quota.
- A paid Stripe session is accepted only when its signed channel, session ID, product IDs, quantities, and active reservation match. Reservation conversion is serialized and atomic.
- Stripe event IDs and Loyverse payload hashes are durable, single-worker claims.
- Loyverse sale and refund creation require an atomic order claim. Provider lookup is recovery support, not the primary concurrency control.
- OAuth/HMAC Loyverse callbacks may carry authoritative event facts. Personal-token callbacks are notifications only; the server refetches catalog and inventory facts from Loyverse before mutation.
- Provider timestamps are monotonic versions for inventory writes.
- Public allocation endpoints use shared database-backed rate limits. Fingerprints are HMAC-pseudonymized before storage.
- Newsletter membership is confirmed opt-in: public submission creates a pending token, and a separate human POST confirms consent.
- Secrets stay server-side, are independently rotated, and privileged bearer secrets require at least 32 characters at runtime.

## Consequences

The system remains provider-neutral at its commerce boundary: a future Bahamas-supported payment gateway can replace Stripe without changing inventory reservation or Loyverse accounting rules. A database migration is required before enabling production checkout, newsletter, webhook, and scheduled routes. Failed paid-order finalization is surfaced for manual reconciliation instead of silently overselling.

## Operational requirements

- Apply every Supabase migration in timestamp order before production traffic.
- Configure `RATE_LIMIT_SECRET`, `SYNC_SECRET`, and callback credentials in the hosting secret store.
- Monitor failed Stripe events, failed Loyverse events, stuck `processing` states, active reservation volume, and duplicate external order references.
- Rotate any credential shared in chat or embedded in an exposed callback URL before launch.
