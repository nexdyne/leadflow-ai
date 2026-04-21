# Email setup (Resend + Google Workspace)

This doc is the checklist David walks through to get LeadFlow AI's
transactional + support email flowing. The backend was built to fail
gracefully when Resend isn't configured — migrations still run, support
tickets still get written, password resets still return the temp
password in the JSON response — but emails are how the user actually
finds out what you just did, so don't leave them off for long.

**Everything runs on one zone: `abatecomply.com`.** Outbound
(transactional) mail is sent from Resend. Inbound mail for
`admin@abatecomply.com` and `support@abatecomply.com` is handled by
Google Workspace. One zone, two providers, no overlap — the Resend
bounce MX and the Google inbound MX coexist on the zone because Google
is priority 1 and Resend's bounce MX is priority 10 (Google wins for
incoming, and Resend's MX is only used for bounce callbacks to the
Amazon SES IP — it isn't in the receive path).

---

## 1. Domain layout

| Purpose                                  | Address                                     |
| ---------------------------------------- | ------------------------------------------- |
| LeadFlow transactional "from"            | `LeadFlow AI <noreply@abatecomply.com>`     |
| Support inbox (ticket alerts land here)  | `support@abatecomply.com`                   |
| Platform admin login (primary)           | `admin@abatecomply.com`                     |
| Platform admin login (backup/recovery)   | `support@abatecomply.com`                   |

`admin@` and `support@` are **real Google Workspace mailboxes** you
read — they're not forwarded. Resend only *sends*; Workspace *receives*
and lets you reply from the same address.

**Why one zone:** The original plan split LeadFlow (abatecomply.com)
from NexDyne Consulting (nexdynegroup.com). That fell apart at setup —
`nexdynegroup.com` is not on the same Cloudflare account as
`abatecomply.com`, so enabling Cloudflare Email Routing there would
have required onboarding a new zone just to receive two addresses.
Since David already had Google Workspace live on `abatecomply.com`,
collapsing the platform admin + support inboxes onto that zone was a
one-migration fix (`029_platform_admin_abatecomply.sql`) instead of a
multi-day DNS coordination project. `nexdynegroup.com` is out of the
LeadFlow stack entirely.

---

## 2. Verify the sending domain in Resend

**`abatecomply.com` — already done.** Verified 2026-04-13 (green
"verified" badge under Resend → Domains). No action needed for
LeadFlow outbound. The four DNS records live on the abatecomply.com
zone in Cloudflare:

- **MX** (bounces, `feedback-smtp.us-east-1.amazonses.com`, priority 10)
- **TXT** (SPF, `v=spf1 include:amazonses.com include:_spf.google.com ~all`
  — note the combined include so both Resend and Workspace pass SPF)
- **TXT** (DKIM, `resend._domainkey`)
- **TXT** (DMARC, `_dmarc`)

All four must be **Proxy status: DNS only** (gray cloud) in Cloudflare.
Orange-cloud proxying rewrites TXT/MX content and breaks validation.

**Reputation warm-up:** Resend's free tier is 3,000 emails/month and
100 emails/day. LeadFlow's current volume (team invites, password
resets, support ticket acks, billing notifications) is an order of
magnitude below that. Upgrade to Pro ($20/mo, 50K/month, no daily
throttle) when you cross 80/day or start sending marketing blasts.

---

## 3. Configure Google Workspace inbound

You already have Workspace on `abatecomply.com`. To finish the admin/
support mailbox setup:

1. In Google Admin (<https://admin.google.com>) → **Directory → Users →
   Add new user** for both:
   - `admin@abatecomply.com` (primary name: Platform Admin)
   - `support@abatecomply.com` (primary name: Support)
2. In Cloudflare DNS for `abatecomply.com`, confirm the Google MX
   records are present. They should look like:

   | Type | Name | Content                      | Priority |
   | ---- | ---- | ---------------------------- | -------- |
   | MX   | `@`  | `smtp.google.com`            | 1        |

   (Workspace used to require five separate MX records pointing at
   `aspmx.l.google.com` etc. The single-record `smtp.google.com` is the
   newer default — either form works.)
3. Resend's bounce MX (priority 10, `feedback-smtp.us-east-1.amazonses.com`)
   stays on the zone. Incoming mail goes to Google first (priority 1
   wins); Resend's bounce MX is only reached by Amazon SES for bounce
   callbacks, which is exactly what it's for.
4. Send yourself a test email from a personal account to
   `admin@abatecomply.com` — you should see it in the Workspace inbox
   within a minute. Do the same for `support@abatecomply.com`.

---

## 4. Create the Resend API key

1. In Resend, go to **API Keys → Create API Key**.
2. Name it `leadflow-railway-prod`.
3. Permissions: **Full access** (the backend needs to send from any
   verified address under the domain).
4. Copy the key — it's shown only once. Starts with `re_`.

---

## 5. Wire Railway env vars

In the Railway LeadFlow service, go to **Variables** and add:

| Variable           | Value                                            |
| ------------------ | ------------------------------------------------ |
| `RESEND_API_KEY`   | `re_…` (from step 4)                             |
| `FROM_EMAIL`       | `LeadFlow AI <noreply@abatecomply.com>`          |
| `SUPPORT_INBOX`    | `support@abatecomply.com`                        |

**After adding, click "Redeploy"** — Restart reuses cached env vars
and reference-style variables (`${{...}}`) won't re-resolve. Only a
full Redeploy picks up the new values.

Verify on the deploy log — you should see no more lines reading
`[Email] Skipping "<template>" to <addr> — RESEND_API_KEY not
configured`. A couple of test actions:

- From the landing page, submit a support request. You should get:
  (a) an ack email to the address you typed, and
  (b) an alert email to `support@abatecomply.com` (visible in the
  Workspace inbox).
- In Platform Admin → Users, click Reset Password on any user. The
  modal should show `Email sent ✓` and a copy of the temp password.
  The user gets a separate email with the same temp password.

---

## 6. First-time platform admin password

The repo ships with two accounts pre-seeded by
`migrations/029_platform_admin_abatecomply.sql`:

- `admin@abatecomply.com` — primary login
- `support@abatecomply.com` — backup / recovery login

(Migration 027 originally seeded `admin@nexdynegroup.com` +
`support@nexdynegroup.com`; migration 029 adds the abatecomply rows
and demotes the old nexdynegroup rows to non-admin + disabled hash.
If you ran the nexdynegroup bootstrap before moving to abatecomply,
those temporary passwords no longer work — run the bootstrap below.)

Both abatecomply rows are created with a non-bcrypt placeholder
password (`!DISABLED!`) that **cannot** be used to sign in. To set
real passwords:

1. In Railway Variables, add:
   ```
   BOOTSTRAP_PLATFORM_ADMIN=1
   ```
2. Redeploy (full Redeploy, not Restart).
3. Open the deploy log. Near the top you'll see two framed banners,
   one for each account:
   ```
   ======================================================================
    PLATFORM ADMIN PASSWORD BOOTSTRAPPED (primary)
      email:    admin@abatecomply.com
      password: <24-char password>

      Log in at https://abatecomply.com — you will be forced to
      change this password on first login.

      REMOVE the BOOTSTRAP_PLATFORM_ADMIN env var in Railway once
      you have captured this password, then Redeploy.
   ======================================================================
   ```
4. **Copy both passwords to a password manager** (1Password, Bitwarden,
   whatever). The log line scrolls away on the next deploy.
5. Remove the `BOOTSTRAP_PLATFORM_ADMIN` env var and Redeploy once
   more. The bootstrap code skips accounts that already have real
   bcrypt hashes, but leaving the flag on is noisy.
6. Sign in at `https://abatecomply.com/login` with the primary
   credential. You'll be forced through the must-change-password flow
   and can set something you'll remember.

**If you lose both:** The recovery path is to re-run the bootstrap.
Set `BOOTSTRAP_PLATFORM_ADMIN=1`, but *first* manually update the
`password_hash` column in the `users` table for the affected account
to `'!DISABLED!'` (via `railway run psql` or the Railway Data tab).
The bootstrap only resets accounts whose password_hash starts with
something other than `$2` (bcrypt).

---

## 7. Email templates currently wired

Anything added to `server/src/utils/email.js`. Current list:

| Template                      | Fires on                                         |
| ----------------------------- | ------------------------------------------------ |
| `sendWelcomeEmail`            | New user signup                                  |
| `sendTeamInviteEmail`         | Admin invites user to a team                     |
| `sendPasswordResetLinkEmail`  | User-initiated "forgot password" flow            |
| `sendAdminPasswordResetEmail` | Admin resets user's password (temp pw delivery)  |
| `sendSupportTicketAlert`      | Landing page support form submit → goes to SUPPORT_INBOX |
| `sendSupportTicketAck`        | Landing page support form submit → goes to submitter     |
| (plus billing, project, signature, etc.)                                         |

All of them go through the same `sendEmail()` helper, which:
- No-ops + logs `[Email] Skipping …` if `RESEND_API_KEY` is missing
- Records an entry in the `email_logs` table on every attempt
- Catches Resend errors without crashing the calling code

---

## 8. Troubleshooting

**"I submitted the support form but no email arrived."**
- Check Railway deploy logs for `[Email] Skipping` or `[Email] Failed
  to send`. If you see the first, `RESEND_API_KEY` isn't set (or you
  only Restarted, didn't Redeploy). If the second, check Resend's
  dashboard → **Emails** for the specific error.
- The row still got written to `support_tickets`. Open Platform Admin
  → Support to triage it manually.
- If Resend reports success but Workspace shows nothing, check
  Workspace → Gmail Spam folder, then Postmaster Tools → Authentication
  for SPF/DKIM/DMARC failures.

**"Resend says my DNS records don't verify."**
- Check that nothing in Cloudflare has orange-cloud-proxied the
  `abatecomply.com` MX/TXT records; they need **Proxy status: DNS
  only** (gray cloud).
- Confirm the SPF record includes BOTH providers:
  `v=spf1 include:amazonses.com include:_spf.google.com ~all`.
  A single `include:` breaks whichever provider it omits.
- Propagation can take up to an hour. If 30 minutes has passed and
  it's still failing, delete and re-add the records.

**"Deliverability is poor — mail goes to spam."**
- Make sure DMARC is set to at least
  `v=DMARC1; p=none; rua=mailto:support@abatecomply.com`. Aggressive
  policies (`p=reject`) only work after DKIM + SPF have been
  consistently passing for a few weeks.
- Warm up the domain: send to yourself and a few known recipients for
  the first week before any bulk activity.
- Google Postmaster Tools (<https://postmaster.google.com>) gives you
  the best signal on what Gmail thinks of your domain. Add
  `abatecomply.com` there once you've sent enough volume for it to
  generate a report.
