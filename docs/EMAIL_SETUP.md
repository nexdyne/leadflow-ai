# Email setup (Resend)

This doc is the checklist David walks through to get LeadFlow AI's
transactional + support email flowing. The backend was built to fail
gracefully when Resend isn't configured — migrations still run, support
tickets still get written, password resets still return the temp
password in the JSON response — but emails are how the user actually
finds out what you just did, so don't leave them off for long.

---

## 1. Pick the sending domain

LeadFlow AI sends all its outbound transactional mail from a dedicated
subdomain of **abatecomply.com** — `mail.abatecomply.com`. This keeps
the product's sending reputation separate from the consulting business
(`nexdynegroup.com`) and makes "from" addresses match the product a
user signed up for.

NexDyne Consulting Group's own outbound mail (proposals, client
correspondence) gets its own subdomain — `mail.nexdynegroup.com` —
verified in the same Resend account. Both subdomains are independent:
one can be live while the other is still propagating, and a
deliverability issue on one doesn't poison the other.

Suggested addresses:

| Purpose                                     | Address                              |
| ------------------------------------------- | ------------------------------------ |
| LeadFlow transactional "from"               | `LeadFlow AI <no-reply@mail.abatecomply.com>` |
| NexDyne Consulting "from" (later)           | `NexDyne <hello@mail.nexdynegroup.com>` |
| Support inbox (ticket alerts land here)     | `support@nexdynegroup.com`           |
| Platform admin login                        | `admin@nexdynegroup.com`             |

The `support@` and `admin@` addresses are **real inboxes** you read —
they're not forwarded through Resend. Resend only *sends* from the
verified subdomains; *receiving* mail at the root `nexdynegroup.com`
addresses is handled by your inbound MX records (Cloudflare Email
Routing or your existing provider — see `CLOUDFLARE_SETUP.md`).

**One Resend account, multiple domains:** there's no extra cost for
having more than one verified domain. The shared ceiling is just the
monthly email volume on your plan (3,000/month on free).

---

## 2. Verify the sending domain(s) in Resend

You only need `mail.abatecomply.com` verified for LeadFlow to start
sending. Verify `mail.nexdynegroup.com` later when NexDyne Consulting
actually needs to send mail — the procedure is identical.

### For each subdomain:

1. Log in at <https://resend.com> and go to **Domains → Add Domain**.
2. Enter the subdomain — `mail.abatecomply.com` (LeadFlow) or
   `mail.nexdynegroup.com` (NexDyne). **Never** the bare domain.
3. Resend shows four DNS records it needs:
   - **MX** (for bounces)
   - **TXT** (SPF, starts with `v=spf1 include:amazonses.com`)
   - **TXT** (DKIM — `resend._domainkey`)
   - **TXT** (DMARC — `_dmarc`, optional but recommended)
4. Copy each record into the **correct Cloudflare zone** — records
   for `mail.abatecomply.com` go under the abatecomply.com zone;
   records for `mail.nexdynegroup.com` go under nexdynegroup.com.
   Resend checks the subdomain, not the parent, so putting records in
   the wrong zone fails silently.
5. See `CLOUDFLARE_SETUP.md` for the click-path. The non-obvious part
   is to leave **Proxy status: DNS only** (gray cloud) on all four
   records. Orange-cloud proxying rewrites TXT/MX content and breaks
   validation.
6. Back in Resend, click **Verify DNS Records**. Propagation usually
   takes 2-10 minutes; up to 30 minutes if Cloudflare is slow that
   day. Once all four show ✅, the domain is ready.

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
| `FROM_EMAIL`       | `LeadFlow AI <no-reply@mail.abatecomply.com>`    |
| `SUPPORT_INBOX`    | `support@nexdynegroup.com`                       |

**Why the "from" and "to" are on different domains:** Resend sends
the mail from the verified `mail.abatecomply.com` subdomain, but the
support alert email is delivered *to* `support@nexdynegroup.com`
(which is the inbox you actually read). Different domains don't cause
delivery problems — SPF/DKIM only validate the sending side.

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
- Double-check that the records are on `mail.nexdynegroup.com`
  (subdomain), not `nexdynegroup.com` (root).
- In Cloudflare, make sure each record has **Proxy status: DNS only**
  (gray cloud). Orange-cloud mode rewrites TXT/MX content and breaks
  validation.
- Propagation can take up to an hour. If 30 minutes has passed and
  it's still failing, delete and re-add the records.

**"Deliverability is poor — mail goes to spam."**
- Make sure DMARC is set to at least `v=DMARC1; p=none; rua=mailto:
  support@nexdynegroup.com`. Aggressive policies (`p=reject`) only
  work after DKIM + SPF have been consistently passing for a few
  weeks.
- Warm up the domain: send to yourself and a few known recipients
  for the first week before any bulk activity.
