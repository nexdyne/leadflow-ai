# Email setup (Resend)

This doc is the checklist David walks through to get LeadFlow AI's
transactional + support email flowing. The backend was built to fail
gracefully when Resend isn't configured — migrations still run, support
tickets still get written, password resets still return the temp
password in the JSON response — but emails are how the user actually
finds out what you just did, so don't leave them off for long.

---

## 1. Pick the sending domain

LeadFlow AI sends all its outbound transactional mail from the
**abatecomply.com** root domain (already verified in Resend — the DNS
records were added 2026-04-13). Since abatecomply.com *is* the LeadFlow
app, sending from the root is semantically clean — the product's
sending reputation lives on the same zone as its public URL, with
nothing else sharing it.

NexDyne Consulting Group's own outbound mail (proposals, client
correspondence) gets a **dedicated subdomain** — `mail.nexdynegroup.com` —
verified separately in the same Resend account when that's needed.
Keeping NexDyne on a subdomain (rather than the root `nexdynegroup.com`)
keeps its sending records from colliding with any inbound MX on the
root zone (Cloudflare Email Routing for `support@` / `admin@`).

Current addresses:

| Purpose                                     | Address                              |
| ------------------------------------------- | ------------------------------------ |
| LeadFlow transactional "from"               | `LeadFlow AI <noreply@abatecomply.com>` |
| NexDyne Consulting "from" (later, not yet set up) | `NexDyne <hello@mail.nexdynegroup.com>` |
| Support inbox (ticket alerts land here)     | `support@nexdynegroup.com`           |
| Platform admin login                        | `admin@nexdynegroup.com`             |

The `support@` and `admin@` addresses are **real inboxes** you read —
they're not forwarded through Resend. Resend only *sends* from the
verified domains; *receiving* mail at the root `nexdynegroup.com`
addresses is handled by your inbound MX records (Cloudflare Email
Routing or your existing provider — see `CLOUDFLARE_SETUP.md`).

**One Resend account, multiple domains:** there's no extra cost for
having more than one verified domain. The shared ceiling is just the
monthly email volume on your plan (3,000/month on free).

**Why abatecomply.com root (not mail.abatecomply.com):** The cleanest
reputation-isolation play would be a dedicated sending subdomain, but
since abatecomply.com's *only* role is the LeadFlow app, there's
nothing else on that zone to poison. Using the root saved the
subdomain DNS-verification step. If you ever add marketing/newsletter
volume, consider migrating to `mail.abatecomply.com` then — the
migration is just a new Resend domain + flipping `FROM_EMAIL`.

---

## 2. Verify the sending domain(s) in Resend

**abatecomply.com — already done.** Verified 2026-04-13 (you'll see
it under Resend → Domains with a green "verified" badge). No action
needed for LeadFlow outbound. The four DNS records (MX for bounces,
SPF TXT, DKIM TXT, DMARC TXT) are live on the abatecomply.com zone in
Cloudflare.

### `mail.nexdynegroup.com` (future — NexDyne Consulting outbound)

Do this only when NexDyne Consulting actually needs to send mail
(proposals, client outreach). LeadFlow doesn't depend on it.

1. Log in at <https://resend.com> and go to **Domains → Add Domain**.
2. Enter `mail.nexdynegroup.com`. **Not** the bare `nexdynegroup.com` —
   the bare root is reserved for real inboxes (Cloudflare Email
   Routing handles inbound MX there), and adding Resend's bounce MX
   on the root would conflict.
3. Resend shows four DNS records:
   - **MX** (for bounces, `feedback-smtp.us-east-1.amazonses.com`)
   - **TXT** (SPF, starts with `v=spf1 include:amazonses.com`)
   - **TXT** (DKIM — `resend._domainkey.mail`)
   - **TXT** (DMARC — `_dmarc.mail`, recommended)
4. Add them in the **nexdynegroup.com** Cloudflare zone. See
   `CLOUDFLARE_SETUP.md` for the click-path. Non-obvious bit:
   **Proxy status: DNS only** (gray cloud) on all four. Orange-cloud
   proxying rewrites TXT/MX content and breaks validation.
5. Back in Resend → **Verify DNS Records**. Propagation: 2-10 min
   typical, up to 30 min if Cloudflare is slow.

**Reputation warm-up:** Resend's free tier gives you 3,000 emails /
month and 100 emails / day. LeadFlow AI's current volume
(team invites, password resets, support ticket acks, billing
notifications) is an order of magnitude below that — the free tier is
fine until you start sending marketing blasts or onboard 50+ teams.

**When to upgrade:** The *Pro* tier ($20/mo) gets you 50K emails/month
and removes the daily throttle. Upgrade when:
- You've started sending to > 80 recipients on any single day, OR
- You're adding marketing/newsletter volume, OR
- You need a dedicated IP for deliverability.

---

## 3. Create the API key

1. In Resend, go to **API Keys → Create API Key**.
2. Name it `leadflow-railway-prod`.
3. Permissions: **Full access** (the backend needs to send from any
   verified address under the domain).
4. Copy the key — it's shown only once. Starts with `re_`.

---

## 4. Wire Railway env vars

In the Railway LeadFlow service, go to **Variables** and add:

| Variable           | Value                                            |
| ------------------ | ------------------------------------------------ |
| `RESEND_API_KEY`   | `re_…` (from step 3)                             |
| `FROM_EMAIL`       | `LeadFlow AI <noreply@abatecomply.com>`          |
| `SUPPORT_INBOX`    | `support@nexdynegroup.com`                       |

**Why the "from" and "to" are on different domains:** Resend sends
the mail from the verified `abatecomply.com` root, but the support
alert email is delivered *to* `support@nexdynegroup.com` (which is the
inbox you actually read). Different domains don't cause delivery
problems — SPF/DKIM only validate the sending side.

**After adding, click "Redeploy"** — Restart reuses cached env vars
and reference-style variables (`${{...}}`) won't re-resolve. Only a
full Redeploy picks up the new values.

Verify on the deploy log — you should see no more lines reading
`[Email] Skipping "<template>" to <addr> — RESEND_API_KEY not
configured`. A couple of test actions:

- From the landing page, submit a support request. You should get:
  (a) an ack email to the address you typed, and
  (b) an alert email to `support@nexdynegroup.com`.
- In Platform Admin → Users, click Reset Password on any user. The
  modal should show `Email sent ✓` and a copy of the temp password.
  The user gets a separate email with the same temp password.

---

## 5. First-time platform admin password

The repo ships with two accounts pre-seeded by
`migrations/027_platform_admin_accounts.sql`:

- `admin@nexdynegroup.com` — primary login
- `support@nexdynegroup.com` — backup / recovery login

Both are created with a non-bcrypt placeholder password (`!DISABLED!`)
that **cannot** be used to sign in. To set real passwords:

1. In Railway Variables, add:
   ```
   BOOTSTRAP_PLATFORM_ADMIN=1
   ```
2. Redeploy (again, full Redeploy — not Restart).
3. Open the deploy log. Near the top you'll see a framed banner:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║  PLATFORM ADMIN BOOTSTRAP — capture these NOW, then remove  ║
   ║  the BOOTSTRAP_PLATFORM_ADMIN env var and redeploy.         ║
   ╠══════════════════════════════════════════════════════════════╣
   ║  admin@nexdynegroup.com   →  <24-char password>             ║
   ║  support@nexdynegroup.com →  <24-char password>             ║
   ╚══════════════════════════════════════════════════════════════╝
   ```
4. **Copy both passwords to a password manager** (1Password, Bitwarden,
   whatever you use). The log line scrolls away on the next deploy.
5. Remove the `BOOTSTRAP_PLATFORM_ADMIN` env var and Redeploy once
   more. This is defense-in-depth: even though the bootstrap code
   skips accounts that already have real bcrypt hashes, leaving the
   flag on is noisy.
6. Sign in at `https://abatecomply.com/login` with one of those
   credentials, then go to **Change Password** (top right) and set
   something you'll remember.

**If you lose both:** The recovery path is to re-run the bootstrap.
Set `BOOTSTRAP_PLATFORM_ADMIN=1`, but *first* manually update the
`password_hash` column in the `users` table for the affected account
to `'!DISABLED!'` (via `railway run psql` or the Railway Data tab).
The bootstrap only resets accounts whose password_hash starts with
something other than `$2` (bcrypt).

---

## 6. Email templates currently wired

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

## 7. Troubleshooting

**"I submitted the support form but no email arrived."**
- Check Railway deploy logs for `[Email] Skipping` or `[Email] Failed
  to send`. If you see the first, `RESEND_API_KEY` isn't set (or you
  only Restarted, didn't Redeploy). If the second, check Resend's
  dashboard → **Emails** for the specific error.
- The row still got written to `support_tickets`. Open Platform Admin
  → Support to triage it manually.

**"Resend says my DNS records don't verify."**
- For LeadFlow (abatecomply.com root) the records are already in
  place — this error shouldn't happen. If it does, check that nothing
  in Cloudflare has orange-cloud-proxied the `abatecomply.com` MX/TXT
  records; they need **Proxy status: DNS only** (gray cloud).
- For NexDyne's future `mail.nexdynegroup.com`, double-check the
  records are on the **subdomain** (`mail.nexdynegroup.com`), not the
  bare root `nexdynegroup.com`. Resend checks the exact label.
- Propagation can take up to an hour. If 30 minutes has passed and
  it's still failing, delete and re-add the records.

**"Deliverability is poor — mail goes to spam."**
- Make sure DMARC is set to at least `v=DMARC1; p=none; rua=mailto:
  support@nexdynegroup.com`. Aggressive policies (`p=reject`) only
  work after DKIM + SPF have been consistently passing for a few
  weeks.
- Warm up the domain: send to yourself and a few known recipients
  for the first week before any bulk activity.
