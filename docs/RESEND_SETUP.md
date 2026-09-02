# Resend setup for Aurum Privée

The storefront email code is complete. Resend will deliver order confirmations, merchant order alerts, pickup/delivery updates, cancellation notices, contact-form notifications and newsletter confirmation emails. Supabase Auth uses a separate Resend connection for account sign-in links.

## Production identities

- Sending domain: `mail.aurumprivee.com`
- From address: `Aurum Privée <orders@mail.aurumprivee.com>`
- Public origin: `https://aurumprivee.com`
- Merchant recipient: a real inbox monitored by the store owner (still to be confirmed)

The nameservers for `aurumprivee.com` currently point to Wix, so the Resend DNS records must be entered in Wix DNS.

## 1. Verify the sending domain

1. In Resend, add `mail.aurumprivee.com` under Domains.
2. Copy every SPF, DKIM and MX record shown by Resend into Wix DNS exactly as provided. Do not invent or reuse values from another domain.
3. Start verification in Resend and wait until the status is **Verified**.
4. Add the optional DMARC record after SPF and DKIM verify.

Using a subdomain keeps transactional-email reputation separate from the public website and any future staff mailbox provider.

## 2. Create the production key

Create a key named `Aurum Privee Netlify Production` with **Sending access**, restricted to `mail.aurumprivee.com`. Copy it immediately; Resend only displays a new key once.

Never commit this key, paste it into a browser-visible `NEXT_PUBLIC_*` variable, or place it in `netlify.toml`.

## 3. Configure local development

Set these values in the ignored `.env.local` file:

```dotenv
RESEND_API_KEY=re_your_private_key
RESEND_FROM_EMAIL="Aurum Privée <orders@mail.aurumprivee.com>"
RESEND_DOMAIN_VERIFIED=true
STORE_NOTIFICATION_EMAIL=the-real-monitored-inbox@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3040
```

Then run the non-sending check:

```bash
npm run preflight:email
```

The preflight checks configuration, key acceptance and domain status. It never sends an email.

## 4. Configure Netlify without deploying

In Netlify, open **Aurum Privée → Project configuration → Environment variables** and add the following for the Production context:

| Variable | Value | Secret |
| --- | --- | --- |
| `RESEND_API_KEY` | production Sending-access key | Yes |
| `RESEND_FROM_EMAIL` | `Aurum Privée <orders@mail.aurumprivee.com>` | No |
| `RESEND_DOMAIN_VERIFIED` | `true` | No |
| `STORE_NOTIFICATION_EMAIL` | confirmed monitored inbox | No |
| `NEXT_PUBLIC_SITE_URL` | `https://aurumprivee.com` | No |

Saving variables does not require a manual deploy now. The values will be used by the next approved build.

## 5. Route account emails through Resend

The website's Resend key covers storefront transactional messages, but Supabase sends account magic links and recovery messages. In Resend, open Integrations, connect the Aurum Privée Supabase project, select `mail.aurumprivee.com`, and configure the sender as `Aurum Privée` / `accounts@mail.aurumprivee.com`.

If configured manually in Supabase Auth SMTP settings, use:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: a Resend API key

Use a separate Resend key for Supabase Auth so it can be rotated independently from order email.

## 6. Acceptance test after approval

1. Send a test order to an address controlled by the team.
2. Confirm the customer confirmation and merchant alert both arrive.
3. Mark the test order ready and confirm the fulfillment email.
4. Request an account magic link and confirm it returns to `/auth/callback`.
5. Confirm SPF, DKIM and DMARC pass in the received message headers.
6. Check Resend logs for delivery, bounce and complaint events.

Do not enable live checkout until these checks pass.
