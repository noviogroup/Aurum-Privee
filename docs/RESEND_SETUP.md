# Resend setup for Aurum Privée

The storefront email code is complete. In the active B2B RFQ release, Resend delivers quote-request acknowledgements, merchant quote notifications, contact-form notifications, staff replies and newsletter confirmation emails. The retained legacy commerce path also contains dormant order and fulfillment messages. Supabase Auth email is needed only if trade accounts are explicitly introduced later or the legacy provider is restored.

## Production identities

- Sending domain: `aurumprivee.com`
- From address: `Aurum Privée <orders@aurumprivee.com>`
- Public origin: `https://aurumprivee.com`
- Merchant recipient: a real inbox monitored by the store owner (still to be confirmed)

The nameservers for `aurumprivee.com` currently point to Wix. The required Resend DNS records are present there and the root domain is verified in Resend.

## 1. Verify the sending domain

1. In Resend, add `aurumprivee.com` under Domains.
2. Copy every SPF, DKIM and MX record shown by Resend into Wix DNS exactly as provided. Do not invent or reuse values from another domain.
3. Start verification in Resend and wait until the status is **Verified**.
4. Add the optional DMARC record after SPF and DKIM verify.

Completed on 17 September 2026. The production Resend account verifies the root domain, so the From address must use that exact domain.

## 2. Create the production key

Two Aurum Privée keys with **Sending access** restricted to `aurumprivee.com` exist as of 18 September 2026. Both showed zero recorded uses during the dashboard audit. Netlify stores `RESEND_API_KEY` as a non-readable secret for Production and Deploy Previews, so its saved value cannot be matched to a key name from the dashboard. A read-only live check on deploy preview `6aadb9a9329918fc5595117b` confirmed that its runtime uses a domain-restricted Sending key and recognizes the dashboard-verified domain. Acceptance messages must still prove delivery. Resend displayed each key value only once; no copy is stored in this repository or documentation.

After the new key has passed the preview runtime check and the acceptance messages have been delivered, revoke the older unused Aurum Privée keys in Resend. Do not remove them before that verification or without owner approval.

Never commit this key, paste it into a browser-visible `NEXT_PUBLIC_*` variable, or place it in `netlify.toml`.

## 3. Configure local development

Set these values in the ignored `.env.local` file:

```dotenv
RESEND_API_KEY=re_your_private_key
RESEND_FROM_EMAIL="Aurum Privée <orders@aurumprivee.com>"
RESEND_DOMAIN_VERIFIED=true
STORE_NOTIFICATION_EMAIL=the-real-monitored-inbox@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3040
```

Then run the non-sending check:

```bash
npm run preflight:email
```

The preflight checks configuration, key acceptance and domain status. It never sends an email. In production, deploy-preview and branch-deploy contexts it also refuses any key with account-wide domain access; the runtime key must be restricted to Sending access for `aurumprivee.com`.

`netlify dev:exec` is not authoritative for this check when `.env.local` exists: the CLI gives the local file precedence over matching project variables. Run the final preflight inside the actual deploy or CI environment, where the saved Netlify secret is used.

## 4. Configure Netlify without deploying

In Netlify, open **Aurum Privée → Project configuration → Environment variables** and add the following. The key is intentionally available to both Production and Deploy Previews so a controlled preview can exercise the real integration before production approval.

| Variable | Value | Secret | Status on 18 September 2026 |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | production Sending-access key | Yes | Configured for Production and Deploy Previews |
| `RESEND_FROM_EMAIL` | `Aurum Privée <orders@aurumprivee.com>` | No | Configured for Production |
| `RESEND_DOMAIN_VERIFIED` | `true` | No | Configured for Production |
| `STORE_NOTIFICATION_EMAIL` | `noviogroup@gmail.com` | No | Configured for Production and Deploy Previews; active monitoring still requires owner confirmation |
| `NEXT_PUBLIC_SITE_URL` | `https://aurumprivee.com` | No | Configured separately in Netlify |

Saving variables does not require a manual deploy now. The values will be used by the next approved build.

## 5. Optional future trade-account email

Skip this section for the current account-free RFQ release. If the business later approves Supabase-backed trade accounts or restores the legacy provider, Supabase can send account magic links and recovery messages through a separate Resend connection. In Resend, open Integrations, connect the Aurum Privée Supabase project, select `aurumprivee.com`, and configure the sender as `Aurum Privée` / `accounts@aurumprivee.com`.

If configured manually in Supabase Auth SMTP settings, use:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: a Resend API key

Use a separate Resend key for Supabase Auth so it can be rotated independently from RFQ email.

## 6. Acceptance test after approval

1. In the actual deploy environment, run `npm run preflight:email` and confirm the domain-scoped Sending key passes.
2. Submit one controlled quote request from an address owned by the team and confirm both buyer and merchant messages arrive exactly once.
3. Confirm the request and notification state appear in `/operations/quotes`.
4. Submit the contact form from an address controlled by the team and confirm the merchant notification arrives.
5. Reply from the protected client-care workspace and confirm the customer receives one message.
6. Join the private list and complete the newsletter confirmation link.
7. Confirm SPF, DKIM and DMARC pass in the received message headers.
8. Check Resend logs for delivery, bounce and complaint events.
